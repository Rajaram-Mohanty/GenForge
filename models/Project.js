import mongoose from 'mongoose';

// Chat message schema for storing conversation history
const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// File schema for storing generated files
const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  isGenerated: {
    type: Boolean,
    default: true
  }
});

// Project schema
const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectType: {
    type: String,
    enum: ['web-app', 'mobile-app', 'desktop-app', 'api', 'library', 'other'],
    default: 'web-app'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived', 'draft'],
    default: 'active'
  },
  // Chat history for this project
  chats: [chatMessageSchema],
  // Generated files for this project
  files: [fileSchema],
  // Project settings and configuration
  settings: {
    framework: {
      type: String,
      default: 'vanilla'
    },
    language: {
      type: String,
      default: 'javascript'
    },
    theme: {
      type: String,
      default: 'light'
    },
    autoSave: {
      type: Boolean,
      default: true
    }
  },
  // Project metadata
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to add a chat message
projectSchema.methods.addChatMessage = function(role, content, metadata = {}) {
  this.chats.push({
    role,
    content,
    metadata
  });
  return this.save();
};

// Method to add a file
projectSchema.methods.addFile = function(filename, path, content, fileType) {
  this.files.push({
    filename,
    path,
    content,
    fileType,
    size: Buffer.byteLength(content, 'utf8')
  });
  return this.save();
};

// Method to update a file
projectSchema.methods.updateFile = function(fileId, content) {
  const file = this.files.id(fileId);
  if (file) {
    file.content = content;
    file.lastModified = new Date();
    file.size = Buffer.byteLength(content, 'utf8');
  }
  return this.save();
};

// Method to delete a file
projectSchema.methods.deleteFile = function(fileId) {
  this.files.pull(fileId);
  return this.save();
};

// Method to get recent chat messages
projectSchema.methods.getRecentChats = function(limit = 50) {
  return this.chats
    .sort({ timestamp: -1 })
    .limit(limit)
    .reverse();
};

// Method to search files by name or type
projectSchema.methods.searchFiles = function(query) {
  return this.files.filter(file => 
    file.filename.toLowerCase().includes(query.toLowerCase()) ||
    file.fileType.toLowerCase().includes(query.toLowerCase())
  );
};

// Index for better query performance
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ 'files.filename': 1 });

const Project = mongoose.model('Project', projectSchema);

export default Project;
