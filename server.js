import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';

import runAgent from './agent.js';
import { connectDB, User, Project } from './models/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const asyncExecute = promisify(exec);

// Connect to MongoDB
connectDB();

// Disconnect legacy EJS frontend (commented out)
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Enable CORS for React frontend
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Disconnect legacy static serving (commented out)
// app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'genforge-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }
};

// Database models are now imported and will be used instead of in-memory storage

// Store API key in memory
let currentApiKey = "AIzaSyDNRIR8Tk1DvqbzvYVEpiixgSDOTivvbik" ;              //|| "AIzaSyB-y4Xu0lsU6Fgb1x-qnH34A-IBbdFBdzk"

// Routes (legacy page routes removed; React handles UI)

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email: email });
    
    if (user && await user.comparePassword(password)) {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      req.session.userId = user._id;
      return res.json({ success: true, user: { id: user._id, username: user.username, email: user.email } });
    } else {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'An error occurred during login' });
  }
});

app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.render('auth', { 
        title: 'Sign Up - GenForge',
        mode: 'signup',
        error: 'User with this email already exists'
      });
    }
    
    // Create new user
    const newUser = new User({
      username: name, // Using name as username for now
      email,
      password
    });
    
    await newUser.save();
    req.session.userId = newUser._id;
    return res.json({ success: true, user: { id: newUser._id, username: newUser.username, email: newUser.email } });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, error: 'An error occurred during signup' });
  }
});

// app.get('/dashboard', requireAuth, async (req, res) => { /* handled by React */ });

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ success: false, error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// (Removed) Real-time SSE generation endpoint

// API Routes for AI Code Generation
app.post('/api/generate-prompt', requireAuth, async (req, res) => {
  try {
    const { prompt } = req.query;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }

    // Create a unique project ID
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Call runAgent function with the prompt and get structured response
    const agentResponse = await runAgent(prompt, currentApiKey);
    
    // Create project in database
    const project = new Project({
      name: `Project ${new Date().toLocaleDateString()}`,
      description: prompt,
      userId: req.session.userId,
      projectType: 'web-app'
    });

    // Add initial chat message
    await project.addChatMessage('user', prompt);
    
    // Add all agent messages as assistant messages
    if (agentResponse.messages && agentResponse.messages.length > 0) {
      console.log(`📝 Saving ${agentResponse.messages.length} assistant messages to database`);
      for (const message of agentResponse.messages) {
        // The messages from agent are simple strings, not objects with role/content
        await project.addChatMessage('assistant', message);
        console.log(`✅ Saved assistant message: ${message.substring(0, 100)}...`);
      }
    }

    // Add generated files to project
    if (agentResponse.fileOperations && Array.isArray(agentResponse.fileOperations)) {
      console.log(`📁 Processing ${agentResponse.fileOperations.length} file operations`);
      for (const fileOp of agentResponse.fileOperations) {
        // Check for write_file operations (the actual structure from agent.js)
        if (fileOp.type === 'write_file' && fileOp.content) {
          const fileExtension = fileOp.name.split('.').pop() || 'txt';
          await project.addFile(fileOp.name, fileOp.path, fileOp.content, fileExtension);
          console.log(`✅ Saved file: ${fileOp.name} (${fileExtension})`);
        }
        // Also handle create_file operations
        else if (fileOp.type === 'create_file' && fileOp.content) {
          const fileExtension = fileOp.name.split('.').pop() || 'txt';
          await project.addFile(fileOp.name, fileOp.path, fileOp.content, fileExtension);
          console.log(`✅ Saved file: ${fileOp.name} (${fileExtension})`);
        }
      }
    }

    await project.save();
    
    // Log key parts of the agent response for debugging/visibility
    try {
      console.log('Agent response summary:', {
        messages: agentResponse?.messages,
        fileOperationsCount: Array.isArray(agentResponse?.fileOperations) ? agentResponse.fileOperations.length : 0,
        finalMessage: agentResponse?.finalMessage,
      });
      if (Array.isArray(agentResponse?.fileOperations) && agentResponse.fileOperations.length > 0) {
        console.log('Agent file operations (first 10):', agentResponse.fileOperations.slice(0, 10));
      }
    } catch (logErr) {
      console.warn('Failed to log agent response:', logErr);
    }
    
    res.json({
      success: true,
      projectId: projectId,
      messages: agentResponse.messages,
      fileOperations: agentResponse.fileOperations,
      finalMessage: agentResponse.finalMessage,
      databaseProjectId: project._id
    });
    
  } catch (error) {
    console.error('Generation error:', error);
    
    // Handle specific API errors
    if (error.message === 'API_QUOTA_EXCEEDED') {
      res.status(429).json({
        success: false,
        error: 'API_QUOTA_EXCEEDED',
        message: 'API quota exceeded. Please update your API key or try again later.'
      });
    } else if (error.message === 'INVALID_API_KEY') {
      res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'Invalid API key. Please update your API key.'
      });
    } else if (error.message.startsWith('API_ERROR:')) {
      res.status(500).json({
        success: false,
        error: 'API_ERROR',
        message: error.message.replace('API_ERROR: ', '')
      });
    } else {
    res.status(500).json({
      success: false,
        error: 'GENERATION_ERROR',
        message: 'An error occurred during generation'
      });
    }
  }
});



// Legacy endpoints removed - all projects now stored in database
// Use /api/project-data/:projectId for database projects

// Download all files as ZIP
app.get('/api/download-all', requireAuth, (req, res) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const project = generatedProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // For now, return a simple response
    // In production, you'd create a ZIP file
    res.json({
      success: true,
      message: 'Download functionality will be implemented with ZIP creation'
    });
    
  } catch (error) {
    console.error('Download all error:', error);
    res.status(500).json({ error: 'Failed to download project' });
  }
});

// API Routes for future features
app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.json({ 
      success: true, 
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email 
      }
    });
  } catch (error) {
    console.error('User API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user data' 
    });
  }
});

// Get user's projects
app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.session.userId })
      .sort({ updatedAt: -1 })
      .select('name description projectType status createdAt updatedAt');
    
    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('Projects fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
});

// Get specific project with files and chats
app.get('/api/project/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ 
      _id: projectId, 
      userId: req.session.userId 
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Project fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    });
  }
});

// Get project data formatted for frontend
app.get('/api/project-data/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ 
      _id: projectId, 
      userId: req.session.userId 
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Convert database project to frontend-compatible format
    const projectStructure = {
      id: project._id.toString(),
      prompt: project.description || project.name,
      createdAt: project.createdAt,
      files: project.files.map(file => ({
        name: file.filename,
        path: file.path,
        content: file.content,
        type: file.fileType,
        language: getLanguageFromFileType(file.fileType),
        extension: `.${file.fileType}`,
        createdAt: file.createdAt,
        lastModified: file.lastModified
      })),
      directories: getDirectoriesFromFiles(project.files),
      rootPath: `/project/${project._id}`,
      // Include chat messages for the chat panel
      chats: project.chats || [],
      // Project metadata
      projectInfo: {
        name: project.name,
        description: project.description,
        projectType: project.projectType,
        status: project.status,
        updatedAt: project.updatedAt
      }
    };
    
    res.json({
      success: true,
      projectStructure: projectStructure
    });
  } catch (error) {
    console.error('Project data fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project data'
    });
  }
});

// Helper function to determine language from file type
function getLanguageFromFileType(fileType) {
  const typeMap = {
    'html': 'html',
    'css': 'css',
    'js': 'javascript',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'jsx': 'javascript',
    'tsx': 'javascript',
    'ts': 'typescript',
    'txt': 'plaintext'
  };
  return typeMap[fileType.toLowerCase()] || 'plaintext';
}

// Helper function to extract directories from file paths
function getDirectoriesFromFiles(files) {
  const directories = new Set();
  files.forEach(file => {
    const pathParts = file.path.split('/');
    for (let i = 1; i < pathParts.length; i++) {
      const dirPath = pathParts.slice(0, i).join('/');
      if (dirPath) {
        directories.add(dirPath);
      }
    }
  });
  return Array.from(directories);
}

// Add chat message to project
app.post('/api/project/:projectId/chat', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { role, content } = req.body;
    
    const project = await Project.findOne({ 
      _id: projectId, 
      userId: req.session.userId 
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    await project.addChatMessage(role, content);
    
    res.json({
      success: true,
      message: 'Chat message added successfully'
    });
  } catch (error) {
    console.error('Chat add error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add chat message'
    });
  }
});

// Delete project
app.delete('/api/project/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Find the project and ensure it belongs to the user
    const project = await Project.findOne({ 
      _id: projectId, 
      userId: req.session.userId 
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    // Store project name for logging
    const projectName = project.name;
    
    // Delete the project from database
    await Project.findByIdAndDelete(projectId);
    
    console.log(`🗑️ Project "${projectName}" (${projectId}) deleted by user ${req.session.userId}`);
    
    res.json({
      success: true,
      message: 'Project deleted successfully',
      projectName: projectName
    });
  } catch (error) {
    console.error('Project delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
});

// API key update endpoint
app.post('/api/update-api-key', requireAuth, (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }

    // Update the API key in memory
    currentApiKey = apiKey;
    
    res.json({
      success: true,
      message: 'API key updated successfully and will persist across server restarts'
    });
    
  } catch (error) {
    console.error('API key update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API key'
    });
  }
});

// Update file content endpoint
app.post('/api/update-file/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { filePath, content } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'File path and content are required'
      });
    }

    // Check if this is a database project ID (MongoDB ObjectId format)
    const isDatabaseProject = /^[0-9a-fA-F]{24}$/.test(projectId);
    
    if (isDatabaseProject) {
      // Update file in database
      const project = await Project.findOne({ 
        _id: projectId, 
        userId: req.session.userId 
      });
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Find the file in the project
      const file = project.files.find(f => f.path === filePath);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found in project'
        });
      }

      // Update file content
      await project.updateFile(file._id, content);
      
      res.json({
        success: true,
        message: 'File updated successfully in database',
        filePath: filePath,
        projectId: projectId
      });
    } else {
      // Legacy project support removed - all projects now in database
      res.status(404).json({
        success: false,
        error: 'Project not found. All projects are now stored in the database.'
      });
    }
    
  } catch (error) {
    console.error('File update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update file'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'NOT_FOUND' });
});

app.listen(PORT, () => {
  console.log(`GenForge server running on http://localhost:${PORT}`);
});