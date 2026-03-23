import { buildFirstPromptGraph } from '../../graph/graphs/firstPromptGraph.js';
import { buildSecondPromptGraph } from '../../graph/graphs/secondPromptGraph.js';
import { buildManualEditGraph } from '../../graph/graphs/manualEditGraph.js';
import * as projectService from '../../services/projectService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve the user's API key from session or DB
// ─────────────────────────────────────────────────────────────────────────────
async function resolveKeys(req) {
  const apiKey = await projectService.resolveUserApiKey(req.session.userId, req.session.apiKey);
  return { apiKey };
}

// ─────────────────────────────────────────────────────────────────────────────
// PATH 1 — Generate Project (non-streaming)
// ─────────────────────────────────────────────────────────────────────────────
export const generateProject = async (req, res) => {
  try {
    const { prompt } = req.query;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const { apiKey } = await resolveKeys(req);
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_API_KEY',
        message: 'No API key configured. Please add your OpenRouter API key first.',
      });
    }

    const graph = buildFirstPromptGraph(null);
    const finalState = await graph.invoke({
      prompt,
      userId: req.session.userId,
      apiKey,
    });

    res.json({
      success: true,
      projectId: finalState.projectId,
      databaseProjectId: finalState.projectId,
      messages: finalState.agentMessages ?? [],
      fileOperations: finalState.fileOperations ?? [],
      finalMessage: finalState.finalMessage ?? 'Application generated!',
    });
  } catch (error) {
    console.error('[generateProject] Error:', error);
    handleError(res, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATH 1 — Stream-Generate Project (SSE)
// ─────────────────────────────────────────────────────────────────────────────
export const streamGenerateProject = async (req, res) => {
  try {
    const { prompt } = req.query;
    if (!prompt) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Prompt is required' })}\n\n`);
      return res.end();
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connection established' })}\n\n`);

    const { apiKey } = await resolveKeys(req);
    if (!apiKey) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'MISSING_API_KEY', message: 'No API key configured.' })}\n\n`);
      return res.end();
    }

    // SSE progress callback — passed into the graph so callLLMNode can stream
    const onProgress = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const graph = buildFirstPromptGraph(onProgress);
    console.log(`[streamGenerateProject] Starting outer graph with recursionLimit: 150`);
    const finalState = await graph.invoke({
      prompt,
      userId: req.session.userId,
      apiKey,
    }, { recursionLimit: 150 });

    res.write(`event: complete\ndata: ${JSON.stringify({
      projectId: finalState.projectId,
      databaseProjectId: finalState.projectId,
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error('[streamGenerateProject] Error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Generation failed' })}\n\n`);
    res.end();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Project CRUD — thin wrappers, no heavy logic here
// ─────────────────────────────────────────────────────────────────────────────
export const getProjects = async (req, res) => {
  try {
    const { Project } = await import('../../models/index.js');
    const projects = await Project.find({ userId: req.session.userId })
      .sort({ updatedAt: -1 })
      .select('name description projectType status createdAt updatedAt');
    res.json({ success: true, projects });
  } catch (error) {
    console.error('[getProjects] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
};

export const getProject = async (req, res) => {
  try {
    const { Project } = await import('../../models/index.js');
    const project = await Project.findOne({
      _id: req.params.projectId,
      userId: req.session.userId,
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, project });
  } catch (error) {
    console.error('[getProject] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
};

export const getProjectData = async (req, res) => {
  try {
    const projectStructure = await projectService.getProjectVirtualStructure(
      req.params.projectId,
      req.session.userId
    );
    res.json({ success: true, projectStructure });
  } catch (error) {
    console.error('[getProjectData] Error:', error);
    if (error.message === 'Project not found') {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch project data' });
  }
};

export const addChatMessage = async (req, res) => {
  try {
    const { role, content } = req.body;
    const { Project } = await import('../../models/index.js');
    const project = await Project.findOne({
      _id: req.params.projectId,
      userId: req.session.userId,
    });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    await project.addChatMessage(role, content);
    res.json({ success: true, message: 'Chat message added successfully' });
  } catch (error) {
    console.error('[addChatMessage] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to add chat message' });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { projectName } = await projectService.deleteProject(
      req.params.projectId,
      req.session.userId
    );
    console.log(`🗑️ Project "${projectName}" deleted by user ${req.session.userId}`);
    res.json({ success: true, message: 'Project deleted successfully', projectName });
  } catch (error) {
    console.error('[deleteProject] Error:', error);
    if (error.message === 'Project not found') {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
};

export const downloadProject = async (req, res) => {
  try {
    const { archive, zipFileName } = await projectService.createProjectArchive(
      req.params.projectId,
      req.session.userId
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    archive.on('error', (err) => {
      console.error('[downloadProject] Archive error:', err);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'Archive failed' });
    });
    archive.pipe(res);
    await archive.finalize();
  } catch (error) {
    console.error('[downloadProject] Error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to download project' });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATH 3 — Manual File Update (Monaco Editor Save)
// ─────────────────────────────────────────────────────────────────────────────
export const updateFile = async (req, res) => {
  try {
    const { filepath, content, filePath } = req.body;
    const targetPath = filePath || filepath;

    if (!targetPath || content === undefined) {
      return res.status(400).json({ success: false, error: 'File path and content are required' });
    }

    const { apiKey } = await resolveKeys(req);

    const graph = buildManualEditGraph();
    const finalState = await graph.invoke({
      projectId: req.params.projectId,
      userId: req.session.userId,
      filePath: targetPath,
      content,
      apiKey,
    });

    res.json({
      success: true,
      ...finalState.syncResult,
    });
  } catch (error) {
    console.error('[updateFile] Error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to update file' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATH 2 — RAG-based Code Update (Second Prompt)
// ─────────────────────────────────────────────────────────────────────────────
export const updateProjectCode = async (req, res) => {
  try {
    const { projectId, prompt } = req.body;

    if (!projectId || !prompt) {
      return res.status(400).json({ success: false, error: 'Project ID and prompt are required' });
    }

    const { apiKey } = await resolveKeys(req);
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_API_KEY',
        message: 'No API key configured.',
      });
    }

    const graph = buildSecondPromptGraph();
    const finalState = await graph.invoke({
      projectId,
      userId: req.session.userId,
      prompt,
      apiKey,
    });

    // If no relevant chunks were found, the graph short-circuited
    if (!finalState.updateSummary) {
      const { Project } = await import('../../models/index.js');
      const project = await Project.findById(projectId);
      if (project) {
        await project.addChatMessage("user", prompt);
        await project.addChatMessage("assistant", "I couldn't find any relevant code to update based on your request.");
      }
      return res.json({
        success: true,
        message: "I couldn't find any relevant code to update based on your request.",
        modifiedFiles: [],
      });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      summary: finalState.updateSummary,
      modifiedFiles: finalState.modifiedFiles ?? [],
    });
  } catch (error) {
    console.error('[updateProjectCode] Error:', error);
    const status = error.message === 'MISSING_API_KEY' ? 400 : 500;
    res.status(status).json({
      success: false,
      error: error.message || 'Failed to update project code',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared error handler
// ─────────────────────────────────────────────────────────────────────────────
const handleError = (res, error) => {
  if (error.message === 'API_QUOTA_EXCEEDED') {
    res.status(429).json({ success: false, error: 'API_QUOTA_EXCEEDED', message: 'API quota exceeded.' });
  } else if (error.message === 'INVALID_API_KEY') {
    res.status(401).json({ success: false, error: 'INVALID_API_KEY', message: 'Invalid API key.' });
  } else if (error.message?.startsWith('API_ERROR:')) {
    res.status(500).json({ success: false, error: 'API_ERROR', message: error.message.replace('API_ERROR: ', '') });
  } else {
    res.status(500).json({ success: false, error: 'GENERATION_ERROR', message: 'An error occurred.' });
  }
};
