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
    const agentResponse = await runAgent(prompt);
    
    // Process the agent response through virtual file system
    const projectStructure = virtualFileSystem.processAgentResponse(projectId, {
      ...agentResponse,
      prompt: prompt
    });
    
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

    // Update the API key in the agent
    // Note: In a production environment, you'd want to store this securely
    // and potentially restart the agent with the new key
    process.env.GEMINI_API_KEY = apiKey;
    
    // For now, we'll just return success
    // In a real implementation, you'd want to validate the key first
    res.json({
      success: true,
      message: 'API key updated successfully'
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



// // Helper function to execute agent generation
// async function executeAgentGeneration(prompt, projectDir) {
//   try {
//     // Try to use the agent integration if available
//     try {
//       const { runAgentGeneration } = await import('./agent-integration.js');
//       const result = await runAgentGeneration(prompt, projectDir);
//       return result;
//     } catch (importError) {
//       console.log('Agent integration not available, using fallback generation');
//       // Fallback to basic generation
//       return await executeBasicGeneration(prompt, projectDir);
//     }
    
//   } catch (error) {
//     console.error('Agent execution error:', error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// }

// // Fallback basic generation function
// async function executeBasicGeneration(prompt, projectDir) {
//   try {
//     const projectName = getProjectNameFromPrompt(prompt);
//     const files = [];
    
//     // Create basic HTML file
//     const htmlContent = generateBasicHTML(projectName);
//     const htmlPath = path.join(projectDir, 'index.html');
//     fs.writeFileSync(htmlPath, htmlContent);
//     files.push({ name: 'index.html', type: 'html' });
    
//     // Create basic CSS file
//     const cssContent = generateBasicCSS();
//     const cssPath = path.join(projectDir, 'style.css');
//     fs.writeFileSync(cssPath, cssContent);
//     files.push({ name: 'style.css', type: 'css' });
    
//     // Create basic JavaScript file
//     const jsContent = generateBasicJS();
//     const jsPath = path.join(projectDir, 'script.js');
//     fs.writeFileSync(jsPath, jsContent);
//     files.push({ name: 'script.js', type: 'js' });
    
//     // Create README
//     const readmeContent = generateREADME(projectName, prompt);
//     const readmePath = path.join(projectDir, 'README.md');
//     fs.writeFileSync(readmePath, readmeContent);
//     files.push({ name: 'README.md', type: 'md' });
    
//     return {
//       success: true,
//       files: files,
//       response: `I've created a basic ${projectName} application based on your prompt: "${prompt}". The project includes HTML, CSS, and JavaScript files with a modern, responsive design. You can download individual files or the entire project.`
//     };
    
//   } catch (error) {
//     console.error('Basic generation error:', error);
//     return {
//       success: false,
//       error: error.message
//     };
//   }
// }

// function getProjectNameFromPrompt(prompt) {
//   const words = prompt.toLowerCase().split(' ');
//   const appTypes = {
//     'todo': 'Todo App',
//     'blog': 'Blog Platform', 
//     'shop': 'E-commerce Store',
//     'chat': 'Chat Application',
//     'dashboard': 'Analytics Dashboard',
//     'portfolio': 'Portfolio Website',
//     'social': 'Social Network',
//     'calculator': 'Calculator App',
//     'weather': 'Weather App',
//     'game': 'Game Application'
//   };
  
//   for (const [key, value] of Object.entries(appTypes)) {
//     if (words.some(word => word.includes(key))) {
//       return value;
//     }
//   }
  
//   return 'Custom Application';
// }

// function generateBasicHTML(projectName) {
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>${projectName}</title>
//     <link rel="stylesheet" href="style.css">
// </head>
// <body>
//     <div class="container">
//         <header>
//             <h1>${projectName}</h1>
//             <p>Generated with GenForge AI</p>
//         </header>
        
//         <main>
//             <div class="content">
//                 <h2>Welcome to your ${projectName}</h2>
//                 <p>This application was generated using AI. You can customize it further by editing the files.</p>
                
//                 <div class="features">
//                     <div class="feature">
//                         <h3>Feature 1</h3>
//                         <p>Description of the first feature</p>
//                     </div>
//                     <div class="feature">
//                         <h3>Feature 2</h3>
//                         <p>Description of the second feature</p>
//                     </div>
//                     <div class="feature">
//                         <h3>Feature 3</h3>
//                         <p>Description of the third feature</p>
//                     </div>
//                 </div>
//             </div>
//         </main>
        
//         <footer>
//             <p>&copy; 2024 ${projectName}. Built with GenForge.</p>
//         </footer>
//     </div>
    
//     <script src="script.js"></script>
// </body>
// </html>`;
// }

// function generateBasicCSS() {
//   return `* {
//     margin: 0;
//     padding: 0;
//     box-sizing: border-box;
// }

// body {
//     font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//     line-height: 1.6;
//     color: #333;
//     background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//     min-height: 100vh;
// }

// .container {
//     max-width: 1200px;
//     margin: 0 auto;
//     padding: 2rem;
// }

// header {
//     text-align: center;
//     margin-bottom: 3rem;
//     color: white;
// }

// header h1 {
//     font-size: 3rem;
//     margin-bottom: 0.5rem;
//     text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
// }

// header p {
//     font-size: 1.2rem;
//     opacity: 0.9;
// }

// main {
//     background: white;
//     border-radius: 1rem;
//     padding: 2rem;
//     box-shadow: 0 10px 30px rgba(0,0,0,0.2);
//     margin-bottom: 2rem;
// }

// .content h2 {
//     color: #333;
//     margin-bottom: 1rem;
//     font-size: 2rem;
// }

// .content p {
//     color: #666;
//     margin-bottom: 2rem;
//     font-size: 1.1rem;
// }

// .features {
//     display: grid;
//     grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
//     gap: 2rem;
//     margin-top: 2rem;
// }

// .feature {
//     background: #f8f9fa;
//     padding: 1.5rem;
//     border-radius: 0.5rem;
//     border-left: 4px solid #667eea;
//     transition: transform 0.3s ease;
// }

// .feature:hover {
//     transform: translateY(-2px);
// }

// .feature h3 {
//     color: #333;
//     margin-bottom: 0.5rem;
// }

// .feature p {
//     color: #666;
// }

// footer {
//     text-align: center;
//     color: white;
//     opacity: 0.8;
// }

// @media (max-width: 768px) {
//     .container {
//         padding: 1rem;
//     }
    
//     header h1 {
//         font-size: 2rem;
//     }
    
//     .features {
//         grid-template-columns: 1fr;
//     }
// }`;
// }

// function generateBasicJS() {
//   return `// Generated JavaScript for your application
// document.addEventListener('DOMContentLoaded', function() {
//     console.log('Application loaded successfully!');
    
//     // Add your custom JavaScript functionality here
//     const features = document.querySelectorAll('.feature');
    
//     features.forEach(feature => {
//         feature.addEventListener('click', function() {
//             this.style.transform = 'scale(1.02)';
//             setTimeout(() => {
//                 this.style.transform = 'scale(1)';
//             }, 200);
//         });
//     });
    
//     // Example: Add a simple animation
//     const header = document.querySelector('header h1');
//     if (header) {
//         header.style.opacity = '0';
//         header.style.transform = 'translateY(-20px)';
        
//         setTimeout(() => {
//             header.style.transition = 'all 0.8s ease';
//             header.style.opacity = '1';
//             header.style.transform = 'translateY(0)';
//         }, 500);
//     }
// });`;
// }

// function generateREADME(projectName, prompt) {
//   return `# ${projectName}

// This project was generated using GenForge AI based on the following prompt:

// > ${prompt}

// ## Files Generated

// - \`index.html\` - Main HTML structure
// - \`style.css\` - Styling and responsive design
// - \`script.js\` - JavaScript functionality
// - \`README.md\` - This file

// ## Getting Started

// 1. Open \`index.html\` in your web browser
// 2. Customize the code to fit your specific needs
// 3. Add more features and functionality as required

// ## Customization

// Feel free to modify any of the generated files to better suit your requirements. The code is well-structured and commented to help you understand and extend it.

// ## Technologies Used

// - HTML5
// - CSS3 (with modern features like Grid and Flexbox)
// - Vanilla JavaScript
// - Responsive design principles

// ## Generated by

// GenForge AI - AI-Powered Development Platform

// ---
// *This project was automatically generated and may require additional customization for production use.*`;
// }

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