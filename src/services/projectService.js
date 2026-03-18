import { Project, User } from '../models/index.js';
import * as ragService from './ragService.js';
import archiver from 'archiver';
import { getLanguageFromFileType, getDirectoriesFromFiles } from '../utils/fileUtils.js';

/**
 * Service to handle project-related business logic.
 */

// Helper to resolve API Key (centralized logic)
export const resolveUserApiKey = async (userId, sessionApiKey) => {
    const user = await User.findById(userId);
    if (!user) return null;

    let apiKey = null;
    if (typeof user.getApiKey === 'function') {
        apiKey = user.getApiKey();
    }
    
    // Fallback to session key if available
    if (!apiKey && sessionApiKey) {
        apiKey = sessionApiKey;
    }

    // Fallback to environment variable key if available
    if (!apiKey && process.env.OPENROUTER_API_KEY) {
        apiKey = process.env.OPENROUTER_API_KEY;
    }
    
    return apiKey;
};

// Helper to generate project name
const generateProjectName = (prompt) => {
    if (!prompt || typeof prompt !== 'string') {
        return `Project ${new Date().toLocaleDateString()}`;
    }
    // Take first 5-6 words from prompt, max 50 characters
    const words = prompt.trim().split(/\s+/).slice(0, 6);
    let name = words.join(' ');
    // If name is too long, truncate it
    if (name.length > 50) {
        name = name.substring(0, 47) + '...';
    }
    // If name is empty or too short, use date-based name
    if (name.length < 3) {
        return `Project ${new Date().toLocaleDateString()}`;
    }
    return name;
};

/**
 * Saves a generated project to the database, including chat history and files.
 */
export const saveGeneratedProject = async (userId, prompt, agentResponse, apiKeyToUse) => {
    // Create new project instance
    const project = new Project({
        name: generateProjectName(prompt),
        description: prompt,
        userId: userId,
        projectType: 'web-app'
    });

    // Add initial user prompt
    await project.addChatMessage('user', prompt);

    // Add agent messages
    if (agentResponse.messages && agentResponse.messages.length > 0) {
        console.log(`📝 Saving ${agentResponse.messages.length} assistant messages to database`);
        for (const message of agentResponse.messages) {
            await project.addChatMessage('assistant', message);
        }
    }

    // Process file operations
    if (agentResponse.fileOperations && Array.isArray(agentResponse.fileOperations)) {
        console.log(`📁 Processing ${agentResponse.fileOperations.length} file operations`);
        for (const fileOp of agentResponse.fileOperations) {
            const hasContent = fileOp.content && (fileOp.type === 'write_file' || fileOp.type === 'create_file');
            
            if (hasContent) {
                const fileExtension = fileOp.name.split('.').pop() || 'txt';
                await project.addFile(fileOp.name, fileOp.path, fileOp.content, fileExtension);
                console.log(`✅ Saved file: ${fileOp.name} (${fileExtension})`);

                // Index file for RAG
                try {
                    await ragService.reIndexFile(project._id, fileOp.path, fileOp.content, apiKeyToUse);
                    console.log(`🔍 Indexed file for RAG: ${fileOp.name}`);
                } catch (indexErr) {
                    console.error(`❌ Failed to index file ${fileOp.name}:`, indexErr);
                }
            }
        }
    }

    await project.save();
    return project;
};

/**
 * Retrieves a project and converts it to a virtual file system structure for the frontend.
 */
export const getProjectVirtualStructure = async (projectId, userId) => {
    const project = await Project.findOne({ _id: projectId, userId });
    
    if (!project) throw new Error('Project not found');

    return {
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
        chats: project.chats || [],
        projectInfo: {
            name: project.name,
            description: project.description,
            projectType: project.projectType,
            status: project.status,
            updatedAt: project.updatedAt
        }
    };
};

/**
 * Creates a zip archive stream for the project files.
 */
export const createProjectArchive = async (projectId, userId) => {
    // Only support database projects (ObjectId format)
    if (!/^[0-9a-fA-F]{24}$/.test(projectId)) {
        throw new Error('Invalid project ID format. Only database projects are supported.');
    }

    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) throw new Error('Project not found');

    const safeProjectName = (project.name || 'genforge-project')
        .replace(/[^a-z0-9_\-]+/gi, '-')
        .toLowerCase();
    
    const zipFileName = `${safeProjectName}.zip`;

    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    // Add files to archive
    if (Array.isArray(project.files) && project.files.length > 0) {
        project.files.forEach((file) => {
            const entryName = file.path || file.filename || 'untitled.txt';
            const content = file.content || '';
            archive.append(content, { name: entryName });
        });
    }

    return { archive, zipFileName, project };
};

/**
 * Updates a single file in the project and re-indexes it for RAG.
 */
export const updateProjectFile = async (projectId, userId, filePath, content, apiKeyToUse) => {
    // Basic validation
    if (!/^[0-9a-fA-F]{24}$/.test(projectId)) {
        throw new Error('Invalid project ID format.');
    }

    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) throw new Error('Project not found');

    const file = project.files.find(f => f.path === filePath);
    if (!file) throw new Error('File not found in project');

    // Update locally in DB
    await project.updateFile(file._id, content);

    // Re-index for RAG if API key is present
    let reIndexMessage = 'Skipped RAG indexing (no API key)';
    if (apiKeyToUse) {
        try {
            await ragService.reIndexFile(projectId, filePath, content, apiKeyToUse);
            reIndexMessage = 'Re-indexed file for RAG';
            console.log(`🔄 ${reIndexMessage}: ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to re-index file ${filePath}:`, error);
            // We don't throw here to avoid failing the main update operation
        }
    }

    return { project, message: reIndexMessage };
};

/**
 * Deletes a project.
 */
export const deleteProject = async (projectId, userId) => {
    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) throw new Error('Project not found');

    const projectName = project.name;
    await Project.findByIdAndDelete(projectId);
    
    return { projectName };
};

/**
 * Updates project code using RAG Agent.
 */
export const updateProjectWithAgent = async (projectId, userId, prompt, apiKeyToUse) => {
    const project = await Project.findOne({ _id: projectId, userId });
    if (!project) throw new Error('Project not found');

    if (!apiKeyToUse) throw new Error('MISSING_API_KEY');

    // Use RAG service to update code
    const result = await ragService.updateCodeWithRAG(projectId, prompt, apiKeyToUse);

    // Add chat messages
    await project.addChatMessage('user', prompt);
    await project.addChatMessage('assistant', result.summary);

    return result;
};
