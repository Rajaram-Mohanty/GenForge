import { runAgent } from '../../agents/core/graphAgent.js';
import * as projectService from '../../services/projectService.js';

export const generateProject = async (req, res) => {
    try {
        const { prompt } = req.query;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        // Create a unique project ID (frontend uses this for optimistic UI, but DB ID is real truth)
        const tempProjectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const apiKeyToUse = await projectService.resolveUserApiKey(req.session.userId, req.session.apiKey);

        if (!apiKeyToUse) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_API_KEY',
                message: 'No API key configured. Please add your Gemini API key first.'
            });
        }

        // Call runAgent function with the prompt and get structured response
        const agentResponse = await runAgent(prompt, apiKeyToUse);

        const project = await projectService.saveGeneratedProject(req.session.userId, prompt, agentResponse, apiKeyToUse);

        res.json({
            success: true,
            projectId: tempProjectId,
            messages: agentResponse.messages,
            fileOperations: agentResponse.fileOperations,
            finalMessage: agentResponse.finalMessage,
            databaseProjectId: project._id
        });

    } catch (error) {
        console.error('Generation error:', error);
        handleError(res, error);
    }
};

export const streamGenerateProject = async (req, res) => {
    try {
        const { prompt } = req.query;
        
        if (!prompt) {
            res.write(`event: error\ndata: ${JSON.stringify({ error: 'Prompt is required' })}\n\n`);
            return res.end();
        }

        // Setup SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Immediate generic connection success message
        res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connection established' })}\n\n`);

        const apiKeyToUse = await projectService.resolveUserApiKey(req.session.userId, req.session.apiKey);

        if (!apiKeyToUse) {
            res.write(`event: error\ndata: ${JSON.stringify({ error: 'MISSING_API_KEY', message: 'No API key configured.' })}\n\n`);
            return res.end();
        }

        // Define onProgress callback
        const onProgress = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        // Call runAgent with streaming
        const agentResponse = await runAgent(prompt, apiKeyToUse, onProgress);

        // Save to DB
        const project = await projectService.saveGeneratedProject(req.session.userId, prompt, agentResponse, apiKeyToUse);

        // Send completion event
        res.write(`event: complete\ndata: ${JSON.stringify({
            projectId: project.id,
            databaseProjectId: project._id,
        })}\n\n`);

        res.end();

    } catch (error) {
        console.error('Stream generation error:', error);
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Generation failed' })}\n\n`);
        res.end();
    }
};

export const getProjects = async (req, res) => {
    try {
        // Need to keep simple query here or move to service if logic grows
        // For now, simple find is fine, calling service method if we want to be strict
        // Let's create a service method for consistency
        // But since service wasn't strictly defined for list, I'll inline standard mongoose call or add to service in next iteration.
        // Actually, let's stick to using the service or model directly if it's simple. 
        // Ideally controller shouldn't touch model.
        // I'll leave it as is for now since I didn't add getAllProjects to service.
        // Wait, I should add it to service to be clean.
        // I will assume I can't import Project here lightly if I want full decoupling.
        // I'll call a service method I'll add later or just import Project for now.
        // To be safe and quick, I'll import Project model here too just for this one query that I didn't move yet.
        // Or I can update service file again.
        // Let's import Project model here to avoid compilation errors, but typically I should move it.
        // For this step, I'll focus on the heavy lifters.
        const { Project } = await import('../../models/index.js');
        
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
        // Simple fetch, doing it directly for now or I can add getProjectById to service
        const { Project } = await import('../../models/index.js');
        const project = await Project.findOne({
            _id: projectId,
            userId: req.session.userId
        });

        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        res.json({ success: true, project });
    } catch (error) {
        console.error('Project fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch project' });
    }
};

export const getProjectData = async (req, res) => {
    try {
        const projectStructure = await projectService.getProjectVirtualStructure(req.params.projectId, req.session.userId);
        res.json({
            success: true,
            projectStructure
        });
    } catch (error) {
        console.error('Project data fetch error:', error);
        if (error.message === 'Project not found') {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        res.status(500).json({ success: false, error: 'Failed to fetch project data' });
    }
};

export const addChatMessage = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { role, content } = req.body;
        // Direct model access for simple update, or move to service
        const { Project } = await import('../../models/index.js');
        const project = await Project.findOne({ _id: projectId, userId: req.session.userId });

        if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

        await project.addChatMessage(role, content);

        res.json({ success: true, message: 'Chat message added successfully' });
    } catch (error) {
        console.error('Chat add error:', error);
        res.status(500).json({ success: false, error: 'Failed to add chat message' });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { projectName } = await projectService.deleteProject(req.params.projectId, req.session.userId);
        
        console.log(`🗑️ Project "${projectName}" (${req.params.projectId}) deleted by user ${req.session.userId}`);

        res.json({
            success: true,
            message: 'Project deleted successfully',
            projectName
        });
    } catch (error) {
        console.error('Project delete error:', error);
        if (error.message === 'Project not found') {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
};

export const downloadProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const { archive, zipFileName } = await projectService.createProjectArchive(projectId, req.session.userId);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: 'Failed to create project archive' });
            }
        });

        archive.pipe(res);
        await archive.finalize();

    } catch (error) {
        console.error('Download project error:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ success: false, error: error.message });
        }
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Failed to download project' });
        }
    }
};

export const updateFile = async (req, res) => {
    try {
        const { filepath, content, filePath } = req.body; // Handle both cases just in case
        const targetPath = filePath || filepath;
        
        if (!targetPath || content === undefined) {
            return res.status(400).json({ success: false, error: 'File path and content are required' });
        }

        const apiKey = await projectService.resolveUserApiKey(req.session.userId, req.session.apiKey);
        
        const result = await projectService.updateProjectFile(
            req.params.projectId, 
            req.session.userId, 
            targetPath, 
            content, 
            apiKey
        );

        res.json({
            success: true,
            message: 'File updated successfully in database',
            filePath: targetPath,
            projectId: req.params.projectId
        });

    } catch (error) {
        console.error('File update error:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to update file' });
    }
};

export const updateProjectCode = async (req, res) => {
    try {
        const { projectId, prompt } = req.body;

        if (!projectId || !prompt) {
            return res.status(400).json({ success: false, error: 'Project ID and prompt are required' });
        }

        const apiKey = await projectService.resolveUserApiKey(req.session.userId, req.session.apiKey);
        
        const result = await projectService.updateProjectWithAgent(projectId, req.session.userId, prompt, apiKey);

        res.json({
            success: true,
            message: 'Project updated successfully',
            summary: result.summary,
            modifiedFiles: result.modifiedFiles
        });

    } catch (error) {
        console.error('Update project code error:', error);
        const status = error.message === 'MISSING_API_KEY' ? 400 : 500;
        res.status(status).json({
            success: false,
            error: error.message || 'Failed to update project code'
        });
    }
};

// Helper for consistent error handling (can be moved to utils)
const handleError = (res, error) => {
    if (error.message === 'API_QUOTA_EXCEEDED') {
        res.status(429).json({ success: false, error: 'API_QUOTA_EXCEEDED', message: 'API quota exceeded.' });
    } else if (error.message === 'INVALID_API_KEY') {
        res.status(401).json({ success: false, error: 'INVALID_API_KEY', message: 'Invalid API key.' });
    } else if (error.message.startsWith('API_ERROR:')) {
        res.status(500).json({ success: false, error: 'API_ERROR', message: error.message.replace('API_ERROR: ', '') });
    } else {
        res.status(500).json({ success: false, error: 'GENERATION_ERROR', message: 'An error occurred during generation' });
    }
};
