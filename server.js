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

import runAgent from './agent.js';
import VirtualFileSystem from './virtual-file-system.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const asyncExecute = promisify(exec);

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    res.redirect('/login');
  }
};

// Temporary user storage (replace with database in production)
const users = [
  {
    id: 1,
    email: 'demo@genforge.com',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // secret
    name: 'Demo User'
  }
];

// Initialize virtual file system
const virtualFileSystem = new VirtualFileSystem();

// Store API key in memory
let currentApiKey = "AIzaSyDNRIR8Tk1DvqbzvYVEpiixgSDOTivvbik" ;              //|| "AIzaSyB-y4Xu0lsU6Fgb1x-qnH34A-IBbdFBdzk"

// Routes
app.get('/', (req, res) => {
  const isAuthenticated = !!req.session.userId;
  const user = isAuthenticated ? users.find(u => u.id === req.session.userId) : null;
  
  res.render('index', { 
    title: 'GenForge - AI-Powered Development',
    isAuthenticated,
    user
  });
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('auth', { 
    title: 'Login - GenForge',
    mode: 'login',
    error: null
  });
});

app.get('/signup', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('auth', { 
    title: 'Sign Up - GenForge',
    mode: 'signup',
    error: null
  });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user.id;
    res.redirect('/dashboard');
  } else {
    res.render('auth', { 
      title: 'Login - GenForge',
      mode: 'login',
      error: 'Invalid email or password'
    });
  }
});

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    return res.render('auth', { 
      title: 'Sign Up - GenForge',
      mode: 'signup',
      error: 'User with this email already exists'
    });
  }
  
  // Create new user
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length + 1,
    name,
    email,
    password: hashedPassword
  };
  
  users.push(newUser);
  req.session.userId = newUser.id;
  res.redirect('/dashboard');
});

app.get('/dashboard', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  res.render('dashboard', { 
    title: 'Dashboard - GenForge',
    user
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/');
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
    
    // Process the agent response through virtual file system
    const projectStructure = virtualFileSystem.processAgentResponse(projectId, {
      ...agentResponse,
      prompt: prompt
    });
    
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
      projectStructure: projectStructure
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



// Get file content
app.get('/api/file/:projectId/:filePath(*)', requireAuth, (req, res) => {
  try {
    const { projectId, filePath } = req.params;
    
    const fileContent = virtualFileSystem.getFileContent(projectId, filePath);
    
    res.json({
      success: true,
      file: fileContent
    });
    
  } catch (error) {
    console.error('File content error:', error);
    res.status(404).json({ 
      success: false,
      error: 'File not found' 
    });
  }
});

// Get project structure
app.get('/api/project/:projectId', requireAuth, (req, res) => {
  try {
    const { projectId } = req.params;
    
    const projectStructure = virtualFileSystem.getProjectStructure(projectId);
    
    res.json({
      success: true,
      project: projectStructure
    });
    
  } catch (error) {
    console.error('Project structure error:', error);
    res.status(404).json({ 
      success: false,
      error: 'Project not found' 
    });
  }
});

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
app.get('/api/user', requireAuth, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  res.json({ 
    success: true, 
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email 
    }
  });
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
app.post('/api/update-file/:projectId', requireAuth, (req, res) => {
  try {
    const { projectId } = req.params;
    const { filePath, content } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'File path and content are required'
      });
    }

    // Sync changes to virtual file system
    const success = virtualFileSystem.syncFileChanges(projectId, filePath, content);
    
    if (success) {
      res.json({
        success: true,
        message: 'File updated successfully',
        filePath: filePath,
        projectId: projectId
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'File not found or update failed'
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
  res.status(500).render('error', { 
    title: 'Error - GenForge',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { 
    title: '404 - Page Not Found'
  });
});

app.listen(PORT, () => {
  console.log(`GenForge server running on http://localhost:${PORT}`);
});