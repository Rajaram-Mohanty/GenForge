import fs from 'fs';
import path from 'path';

class VirtualFileSystem {
  constructor() {
    this.rootDir = path.join(process.cwd(), 'virtual-projects');
    this.projects = new Map();
  }

  // Create a new project
  createProject(projectId, prompt) {
    const projectPath = path.join(this.rootDir, projectId);
    
    // Create project directory if it doesn't exist
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
    }
    
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const project = {
      id: projectId,
      prompt: prompt,
      path: projectPath,
      files: new Map(),
      directories: new Set(),
      createdAt: new Date()
    };

    this.projects.set(projectId, project);
    return project;
  }

  // Add a file to the project
  addFile(projectId, filePath, content, fileType = 'text') {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Determine file extension and language
    const extension = path.extname(filePath);
    let language = 'plaintext';
    
    if (extension === '.html') language = 'html';
    else if (extension === '.css') language = 'css';
    else if (extension === '.js') language = 'javascript';
    else if (extension === '.json') language = 'json';
    else if (extension === '.md') language = 'markdown';
    else if (extension === '.py') language = 'python';
    else if (extension === '.jsx' || extension === '.tsx') language = 'javascript';
    else if (extension === '.ts') language = 'typescript';

    const file = {
      name: path.basename(filePath),
      path: filePath,
      content: content,
      type: fileType,
      language: language,
      extension: extension,
      createdAt: new Date()
    };

    project.files.set(filePath, file);

    // Write to actual file system
    const fullPath = path.join(project.path, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    
    return file;
  }

  // Add a directory to the project
  addDirectory(projectId, dirPath) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    project.directories.add(dirPath);
    
    // Create actual directory
    const fullPath = path.join(project.path, dirPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    return dirPath;
  }

  // Get project structure
  getProjectStructure(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const structure = {
      id: project.id,
      prompt: project.prompt,
      createdAt: project.createdAt,
      files: Array.from(project.files.values()),
      directories: Array.from(project.directories),
      rootPath: project.path
    };

    return structure;
  }

  // Get file content
  getFileContent(projectId, filePath) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const file = project.files.get(filePath);
    if (!file) {
      throw new Error(`File ${filePath} not found in project ${projectId}`);
    }

    return file;
  }

  // List all projects
  listProjects() {
    return Array.from(this.projects.values()).map(project => ({
      id: project.id,
      prompt: project.prompt,
      createdAt: project.createdAt,
      fileCount: project.files.size,
      directoryCount: project.directories.size
    }));
  }

  // Delete project
  deleteProject(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Remove from actual file system
    if (fs.existsSync(project.path)) {
      fs.rmSync(project.path, { recursive: true, force: true });
    }

    // Remove from memory
    this.projects.delete(projectId);
  }

  // Process agent response and create files
  processAgentResponse(projectId, agentResponse) {
    const project = this.createProject(projectId, agentResponse.prompt || '');
    
    // Process file operations
    if (agentResponse.fileOperations) {
      agentResponse.fileOperations.forEach(operation => {
        try {
          switch (operation.type) {
            case 'create_directory':
              this.addDirectory(projectId, operation.path);
              break;
            case 'create_file':
              this.addFile(projectId, operation.path, operation.content || '');
              break;
            case 'write_file':
              this.addFile(projectId, operation.path, operation.content);
              break;
          }
        } catch (error) {
          console.error(`Error processing file operation:`, error);
        }
      });
    }

    return this.getProjectStructure(projectId);
  }

  // Sync changes from application back to virtual file system
  syncFileChanges(projectId, filePath, newContent) {
    try {
      const project = this.projects.get(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Update the file in memory
      const file = project.files.get(filePath);
      if (file) {
        file.content = newContent;
        file.updatedAt = new Date();
        
        // Also update the actual file on disk
        const fullPath = path.join(project.path, filePath);
        fs.writeFileSync(fullPath, newContent, 'utf8');
        
        console.log(`✅ Synced changes for ${filePath} in project ${projectId}`);
        return true;
      } else {
        console.log(`⚠️ File ${filePath} not found in project ${projectId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error syncing file changes:`, error);
      return false;
    }
  }

  // Get all projects with their latest file contents
  getAllProjectsWithContent() {
    return Array.from(this.projects.values()).map(project => ({
      id: project.id,
      prompt: project.prompt,
      createdAt: project.createdAt,
      files: Array.from(project.files.values()).map(file => ({
        ...file,
        content: file.content // Include actual content
      })),
      directories: Array.from(project.directories)
    }));
  }
}

export default VirtualFileSystem;

