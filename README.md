# GenForge - AI-Powered Web Development Platform

## 🎯 Project Overview

**GenForge** is an innovative AI-powered web development platform that enables users to generate complete, functional web applications using natural language prompts. The platform leverages Google's Gemini AI to understand user requirements and automatically create HTML, CSS, and JavaScript code for fully functional web applications.

### 🚀 Key Features

- **AI-Powered Code Generation**: Generate complete web applications using natural language descriptions
- **Real-Time Code Editor**: Monaco Editor integration with syntax highlighting and auto-completion
- **Live Application Preview**: Preview generated applications in real-time within the platform
- **Virtual File System**: Organized project management with file structure visualization
- **Chat-Like Interface**: Interactive progress tracking with step-by-step generation updates
- **API Key Management**: Secure and user-friendly API key configuration
- **Responsive Design**: Modern, intuitive user interface with draggable panels
- **Authentication System**: User login/signup with session management

## 🛠 Technology Stack

### **Backend Technologies**
- **Node.js** (v18+) - Server-side JavaScript runtime
- **Express.js** - Web application framework
- **EJS** - Embedded JavaScript templating engine
- **bcryptjs** - Password hashing and authentication
- **express-session** - Session management
- **dotenv** - Environment variable management

### **Frontend Technologies**
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox and Grid
- **JavaScript (ES6+)** - Client-side functionality
- **Monaco Editor** - Professional code editor (same as VS Code)
- **Font Awesome** - Icon library

### **AI & External Services**
- **Google Gemini AI** - Advanced language model for code generation
- **Google Generative AI SDK** - Official Node.js client library

### **Development Tools**
- **npm** - Package manager
- **Git** - Version control
- **VS Code** - Recommended IDE

## 📋 Software Requirements

### **System Requirements**
- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: 1GB free space
- **Internet**: Required for AI API calls

### **Browser Requirements**
- **Chrome**: Version 90+
- **Firefox**: Version 88+
- **Safari**: Version 14+
- **Edge**: Version 90+

## 🏗 Architecture Overview

### **System Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Service    │
│   (EJS Views)   │◄──►│   (Express.js)  │◄──►│   (Gemini AI)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monaco Editor │    │ Virtual File    │    │   Code          │
│   (Code Editor) │    │ System (VFS)    │    │   Generation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Core Components**

1. **Authentication System**
   - User registration and login
   - Session-based authentication
   - Password encryption with bcrypt

2. **AI Code Generation Engine**
   - Natural language processing
   - Structured command parsing
   - Multi-file code generation (HTML, CSS, JS)

3. **Virtual File System (VFS)**
   - In-memory project management
   - File structure organization
   - Bidirectional file synchronization

4. **Real-Time Code Editor**
   - Monaco Editor integration
   - Syntax highlighting
   - Auto-save functionality
   - Live code updates

5. **Application Preview System**
   - Live HTML rendering
   - CSS and JavaScript execution
   - Responsive preview mode

## 🔧 Installation & Setup

### **Prerequisites**
```bash
# Install Node.js (if not already installed)
# Download from https://nodejs.org/

# Verify installation
node --version
npm --version
```

### **Project Setup**
```bash
# Clone the repository
git clone <repository-url>
cd GenForge

# Install dependencies
npm install

# Create .env file (optional)
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start the application
npm start
```

### **Environment Configuration**
```bash
# Required environment variables
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=your_session_secret
PORT=8080 (optional, defaults to 8080)
```

## 🎨 User Interface Features

### **Dashboard Layout**
- **Split-Panel Design**: Left panel for chat/input, right panel for code/preview
- **Draggable Resizer**: Adjustable panel widths for optimal workspace
- **Navigation Bar**: User info, API key management, logout functionality

### **Code Generation Interface**
- **Prompt Input**: Natural language description of desired application
- **Progress Tracking**: Real-time updates during code generation
- **File Sidebar**: Organized project structure with file navigation
- **Code Editor**: Professional editing experience with syntax highlighting

### **Preview System**
- **Toggle Controls**: Switch between code editor and live preview
- **File Selector**: Choose which HTML file to preview
- **Refresh Controls**: Update preview with latest changes
- **External Preview**: Open in new tab for full-screen experience

## 🔐 Security Features

### **Authentication & Authorization**
- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure session handling
- **Route Protection**: Authentication middleware for protected routes

### **API Key Management**
- **Secure Storage**: In-memory storage with environment variable fallback
- **User Interface**: Modal-based API key updates
- **Validation**: Input validation and error handling

### **Data Protection**
- **Input Sanitization**: XSS prevention
- **CSRF Protection**: Session-based security
- **Error Handling**: Graceful error management

## 📊 Performance & Scalability

### **Performance Optimizations**
- **Lazy Loading**: Monaco Editor loads on demand
- **Debounced Updates**: Optimized file synchronization
- **Caching**: In-memory project storage
- **Efficient Rendering**: EJS template optimization

### **Scalability Considerations**
- **Modular Architecture**: Separated concerns for easy scaling
- **Stateless Design**: Session-based user management
- **API Abstraction**: Easy to switch AI providers
- **Database Ready**: Prepared for database integration

## 🚀 Key Innovations

### **AI Integration**
- **Natural Language Processing**: Convert user descriptions to code
- **Structured Output**: Organized file generation with proper structure
- **Error Handling**: Robust API error management
- **Fallback Mechanisms**: Graceful degradation on API failures

### **Developer Experience**
- **Real-Time Feedback**: Immediate visual feedback during generation
- **Code Quality**: Generated code follows best practices
- **Editability**: Full control over generated code
- **Preview Integration**: Instant application testing

### **User Experience**
- **Intuitive Interface**: Chat-like interaction model
- **Visual Progress**: Step-by-step generation updates
- **Flexible Workspace**: Customizable panel layouts
- **Accessibility**: Keyboard navigation and screen reader support

## 📈 Future Enhancements

### **Planned Features**
- **Database Integration**: Persistent project storage
- **User Management**: Multi-user support with project sharing
- **Template Library**: Pre-built application templates
- **Export Functionality**: ZIP download of generated projects
- **Version Control**: Git integration for project history
- **Collaboration**: Real-time collaborative editing

### **Technical Improvements**
- **Microservices Architecture**: Scalable service decomposition
- **Real-Time Updates**: WebSocket integration for live collaboration
- **Advanced AI Models**: Support for multiple AI providers
- **Mobile Application**: React Native or Flutter mobile app
- **Cloud Deployment**: Docker containerization and cloud hosting

## 🎯 Use Cases

### **Educational Institutions**
- **Programming Courses**: Visual learning of web development
- **Project-Based Learning**: Hands-on application building
- **Code Review**: Understanding generated code structure

### **Business Applications**
- **Rapid Prototyping**: Quick application mockups
- **Internal Tools**: Custom business applications
- **Client Demos**: Fast proof-of-concept development

### **Individual Developers**
- **Learning Tool**: Understanding web development concepts
- **Code Reference**: Best practices and patterns
- **Project Starting Point**: Foundation for custom applications

## 📝 API Documentation

### **Core Endpoints**
```
POST /api/generate-prompt - Generate code from prompt
GET  /api/file/:projectId/:filePath - Get file content
POST /api/update-file/:projectId - Update file content
POST /api/update-api-key - Update API key
GET  /api/project/:projectId - Get project structure
```

### **Authentication Endpoints**
```
GET  /login - Login page
POST /login - Authenticate user
GET  /signup - Registration page
POST /signup - Create new user
POST /logout - End session
```

## 🔍 Troubleshooting

### **Common Issues**
1. **API Key Errors**: Ensure valid Gemini API key is configured
2. **Port Conflicts**: Change PORT environment variable if 8080 is busy
3. **Node Version**: Ensure Node.js 18+ is installed
4. **Dependencies**: Run `npm install` to install missing packages

### **Performance Issues**
1. **Memory Usage**: Monitor RAM usage during large project generation
2. **Network Latency**: Check internet connection for AI API calls
3. **Browser Compatibility**: Use supported browser versions

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**GenForge** - Transforming ideas into code with AI-powered web development.
