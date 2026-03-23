import { Project } from "../../../models/index.js";

/**
 * PATH 3 — Node 2: updateDBNode
 *
 * Saves the editor's new file content directly to MongoDB.
 * Finds the project, locates the file by path, and calls project.updateFile().
 *
 * Input state keys:  projectId, userId, filePath, content
 * Output state keys: status
 */
export async function updateDBNode(state) {
  const { projectId, userId, filePath, content } = state;

  console.log(`[manualEdit/updateDBNode] Persisting manual edit to MongoDB...`);

  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) {
    console.error(`[manualEdit/updateDBNode] Project not found: ${projectId} for user: ${userId}`);
    throw new Error(`[manualEdit/updateDBNode] Project not found: ${projectId}`);
  }

  const file = project.files.find((f) => f.path === filePath);
  if (!file) {
    console.error(`[manualEdit/updateDBNode] File path: ${filePath} not found in project document.`);
    throw new Error(`[manualEdit/updateDBNode] File not found: ${filePath}`);
  }

  await project.updateFile(file._id, content);
  console.log(`[manualEdit/updateDBNode] Success! File content updated for: ${filePath}`);

  return { status: "db_updated" };
}

