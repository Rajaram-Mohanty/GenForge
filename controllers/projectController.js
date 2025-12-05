import { Project, User } from '../models/index.js';
import runAgent from '../agent.js';
import * as ragService from '../services/ragService.js';
import archiver from 'archiver';
import { getLanguageFromFileType, getDirectoriesFromFiles } from '../utils/fileUtils.js';

export const generateProject = async (req, res) => {
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

        // Resolve API key for this user
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED'
            });
        }

        let apiKeyToUse = null;
        if (typeof user.getApiKey === 'function') {
            apiKeyToUse = user.getApiKey();
        }

        // Fallback to session key if available (set via update-api-key)
        if (!apiKeyToUse && req.session.apiKey) {
            apiKeyToUse = req.session.apiKey;
        }

        if (!apiKeyToUse) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_API_KEY',
                message: 'No API key configured. Please add your Gemini API key first.'
            });
        }

        // Call runAgent function with the prompt and get structured response
        const agentResponse = await runAgent(prompt, apiKeyToUse);

        // Generate a meaningful project name from the prompt
        const generateProjectName = (prompt) => {
            if (!prompt || typeof prompt !== 'string') {
                return `Project ${new Date().toLocaleDateString()}`
            }
            // Take first 5-6 words from prompt, max 50 characters
            const words = prompt.trim().split(/\s+/).slice(0, 6)
            let name = words.join(' ')
            // If name is too long, truncate it
            if (name.length > 50) {
                name = name.substring(0, 47) + '...'
            }
            // If name is empty or too short, use date-based name
            if (name.length < 3) {
                return `Project ${new Date().toLocaleDateString()}`
            }
            return name
        }

        // Create project in database
        const project = new Project({
            name: generateProjectName(prompt),
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

                    // Index the file for RAG
                    try {
                        await ragService.reIndexFile(project._id, fileOp.path, fileOp.content);
                        console.log(`🔍 Indexed file for RAG: ${fileOp.name}`);
                    } catch (indexErr) {
                        console.error(`❌ Failed to index file ${fileOp.name}:`, indexErr);
                    }
                }
                // Also handle create_file operations
                else if (fileOp.type === 'create_file' && fileOp.content) {
                    const fileExtension = fileOp.name.split('.').pop() || 'txt';
                    await project.addFile(fileOp.name, fileOp.path, fileOp.content, fileExtension);
                    console.log(`✅ Saved file: ${fileOp.name} (${fileExtension})`);

                    // Index the file for RAG
                    try {
                        await ragService.reIndexFile(project._id, fileOp.path, fileOp.content);
                        console.log(`🔍 Indexed file for RAG: ${fileOp.name}`);
                    } catch (indexErr) {
                        console.error(`❌ Failed to index file ${fileOp.name}:`, indexErr);
                    }
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
};

export const getProjects = async (req, res) => {
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
};

export const getProject = async (req, res) => {
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
};

export const getProjectData = async (req, res) => {
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

        // Convert database project to virtual file system format
        const virtualProjectStructure = {
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
            projectStructure: virtualProjectStructure
        });
    } catch (error) {
        console.error('Project data fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project data'
        });
    }
};

export const addChatMessage = async (req, res) => {
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
};

export const deleteProject = async (req, res) => {
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
};

export const downloadProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'Project ID is required'
            });
        }

        // Only support database projects (ObjectId) since legacy projects are removed
        const isDatabaseProject = /^[0-9a-fA-F]{24}$/.test(projectId);
        if (!isDatabaseProject) {
            return res.status(404).json({
                success: false,
                error: 'Project not found. All projects are now stored in the database.'
            });
        }

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

        const safeProjectName = (project.name || 'genforge-project')
            .replace(/[^a-z0-9_\-]+/gi, '-')
            .toLowerCase();

        const zipFileName = `${safeProjectName}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to create project archive'
                });
            } else {
                res.end();
            }
        });

        archive.on('warning', (err) => {
            console.warn('Archive warning:', err);
        });

        // Pipe archive data to the response
        archive.pipe(res);

        // Add each file from the database into the archive
        if (Array.isArray(project.files) && project.files.length > 0) {
            project.files.forEach((file) => {
                const entryName = file.path || file.filename || 'untitled.txt';
                const content = file.content || '';
                archive.append(content, { name: entryName });
            });
        }

        // Finalize the archive (this will start the stream)
        await archive.finalize();
    } catch (error) {
        console.error('Download project error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Failed to download project'
            });
        } else {
            res.end();
        }
    }
};

export const updateFile = async (req, res) => {
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

            // Re-index the file for RAG
            try {
                await ragService.reIndexFile(projectId, filePath, content);
                console.log(`🔄 Re-indexed file after manual update: ${filePath}`);
            } catch (reIndexError) {
                console.error(`❌ Failed to re-index file ${filePath}:`, reIndexError);
                // We don't fail the request if re-indexing fails, but we log it
            }

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
};

export const updateProjectCode = async (req, res) => {
    try {
        const { projectId, prompt } = req.body;

        if (!projectId || !prompt) {
            return res.status(400).json({
                success: false,
                error: 'Project ID and prompt are required'
            });
        }

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

        // Get API key
        const user = await User.findById(req.session.userId);
        let apiKeyToUse = null;
        if (typeof user.getApiKey === 'function') {
            apiKeyToUse = user.getApiKey();
        }
        if (!apiKeyToUse && req.session.apiKey) {
            apiKeyToUse = req.session.apiKey;
        }

        if (!apiKeyToUse) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_API_KEY',
                message: 'No API key configured.'
            });
        }

        // Use RAG service to update code
        const result = await ragService.updateCodeWithRAG(projectId, prompt, apiKeyToUse);

        // Add chat messages
        await project.addChatMessage('user', prompt);
        await project.addChatMessage('assistant', result.summary);

        res.json({
            success: true,
            message: 'Project updated successfully',
            summary: result.summary,
            modifiedFiles: result.modifiedFiles
        });

    } catch (error) {
        console.error('Update project code error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update project code'
        });
    }
};
