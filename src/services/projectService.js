import { Project, User } from '../models/index.js';
import archiver from 'archiver';
import { getLanguageFromFileType, getDirectoriesFromFiles } from '../utils/fileUtils.js';
import { deleteVectorsForProject } from '../core/vectorDB.js';

/**
 * Pure DB / utility helpers used by the new graph nodes and the API controller.
 * Heavy generation / RAG logic has moved into src/graph/nodes/.
 */

// ─────────────────────────────────────────────────────────────────────────────
// API Key Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the API key for a user:
 *   1. From the user's stored profile (getApiKey method)
 *   2. Fallback to a session-provided key
 *   3. Fallback to the OPENROUTER_API_KEY environment variable
 *
 * @param {string} userId
 * @param {string|null} sessionApiKey
 * @returns {Promise<string|null>}
 */
export const resolveUserApiKey = async (userId, sessionApiKey) => {
  const user = await User.findById(userId);
  if (!user) return null;

  let apiKey = typeof user.getApiKey === 'function' ? user.getApiKey() : null;
  if (!apiKey && sessionApiKey) apiKey = sessionApiKey;
  if (!apiKey && process.env.OPENROUTER_API_KEY) apiKey = process.env.OPENROUTER_API_KEY;

  return apiKey;
};

// ─────────────────────────────────────────────────────────────────────────────
// Project Read Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the virtual file-system structure for a project, safe to send to the frontend.
 *
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export const getProjectVirtualStructure = async (projectId, userId) => {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) throw new Error('Project not found');

  return {
    id: project._id.toString(),
    prompt: project.description || project.name,
    createdAt: project.createdAt,
    files: project.files.map((file) => ({
      name: file.filename,
      path: file.path,
      content: file.content,
      type: file.fileType,
      language: getLanguageFromFileType(file.fileType),
      extension: `.${file.fileType}`,
      createdAt: file.createdAt,
      lastModified: file.lastModified,
    })),
    directories: getDirectoriesFromFiles(project.files),
    rootPath: `/project/${project._id}`,
    chats: project.chats || [],
    projectInfo: {
      name: project.name,
      description: project.description,
      projectType: project.projectType,
      status: project.status,
      updatedAt: project.updatedAt,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Project Download
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an archiver zip stream for the project files.
 *
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<{ archive: Archiver, zipFileName: string, project: Project }>}
 */
export const createProjectArchive = async (projectId, userId) => {
  if (!/^[0-9a-fA-F]{24}$/.test(projectId)) {
    throw new Error('Invalid project ID format. Only database projects are supported.');
  }

  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) throw new Error('Project not found');

  const safeProjectName = (project.name || 'genforge-project')
    .replace(/[^a-z0-9_\-]+/gi, '-')
    .toLowerCase();
  const zipFileName = `${safeProjectName}.zip`;

  const archive = archiver('zip', { zlib: { level: 9 } });

  if (Array.isArray(project.files) && project.files.length > 0) {
    project.files.forEach((file) => {
      const entryName = file.path || file.filename || 'untitled.txt';
      archive.append(file.content || '', { name: entryName });
    });
  }

  return { archive, zipFileName, project };
};

// ─────────────────────────────────────────────────────────────────────────────
// Project Delete
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permanently deletes a project.
 *
 * @param {string} projectId
 * @param {string} userId
 * @returns {Promise<{ projectName: string }>}
 */
export const deleteProject = async (projectId, userId) => {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) throw new Error('Project not found');

  const projectName = project.name;
  
  // 1. Delete vectors from Atlas
  try {
    await deleteVectorsForProject(projectId);
    console.log(`[deleteProject] Deleted all vectors for project: ${projectId}`);
  } catch (err) {
    console.warn(`[deleteProject] Warning: Failed to delete vectors for project ${projectId}:`, err.message);
  }

  // 2. Delete project from MongoDB
  await Project.findByIdAndDelete(projectId);

  return { projectName };
};
