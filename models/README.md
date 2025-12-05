# Models Documentation

This folder contains the MongoDB models for the GenForge application.

## Files

- `User.js` - User model for authentication and user management
- `Project.js` - Project model for storing user projects, chats, and files
- `database.js` - MongoDB connection configuration
- `index.js` - Exports all models and database connection

## Usage

### Database Connection

```javascript
import { connectDB } from './models/index.js';

// Connect to MongoDB
await connectDB();
```

### User Model

```javascript
import { User } from './models/index.js';

// Create a new user
const user = new User({
  username: 'john_doe',
  password: 'securepassword123',
  email: 'john@example.com'
});

await user.save();

// Find user by username
const foundUser = await User.findOne({ username: 'john_doe' });

// Compare password
const isMatch = await foundUser.comparePassword('securepassword123');
```

### Project Model

```javascript
import { Project } from './models/index.js';

// Create a new project
const project = new Project({
  name: 'My Todo App',
  description: 'A simple todo application',
  userId: user._id,
  projectType: 'web-app'
});

await project.save();

// Add chat message
await project.addChatMessage('user', 'Create a todo app with React');
await project.addChatMessage('assistant', 'I\'ll help you create a React todo app...');

// Add a file
await project.addFile('index.html', '/index.html', '<html>...</html>', 'html');

// Get recent chats
const recentChats = project.getRecentChats(10);

// Search files
const htmlFiles = project.searchFiles('html');
```

## Environment Variables

Create a `.env` file with the following variables:

```
RESOURCE_DB=mongodb://localhost:27017/genforge
SESSION_SECRET=your-session-secret-key-here
PORT=3000
NODE_ENV=development
```

## Installation

Make sure to install the required dependencies:

```bash
npm install mongoose bcryptjs dotenv
```
