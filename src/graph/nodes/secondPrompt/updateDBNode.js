import { Project } from "../../../models/index.js";

/**
 * Applies a code patch to a specific line range within a file's full content.
 *
 * @param {string} fullContent  The entire file content as a string.
 * @param {number} startLine    1-based start line number of the chunk to replace.
 * @param {number} endLine      1-based end line number of the chunk to replace.
 * @param {string} newCode      The replacement code.
 * @returns {string} The updated full file content.
 */
function applyPatch(fullContent, startLine, endLine, newCode) {
  // If we don't have line numbers, replace the entire file content
  if (!startLine || !endLine) {
    console.warn("[updateDBNode] No line numbers available — replacing entire file content.");
    return newCode;
  }

  const lines = fullContent.split("\n");
  const startIndex = Math.max(0, startLine - 1);
  const endIndex = Math.min(lines.length - 1, endLine - 1);
  const deleteCount = endIndex - startIndex + 1;

  console.log(`[updateDBNode] Patching lines ${startLine}-${endLine} (indices ${startIndex}-${endIndex})`);

  const newLines = newCode.split("\n");
  lines.splice(startIndex, deleteCount, ...newLines);
  return lines.join("\n");
}

/**
 * PATH 2 — Node 7: updateDBNode
 *
 * Applies the patch to the file and saves the updated content to MongoDB.
 * Also records the chat messages for this turn.
 *
 * Input state keys:  projectId, bestChunk, patchedCode, prompt
 * Output state keys: content (updated file content), filePath, modifiedFiles,
 *                    updateSummary, status
 */
export async function updateDBNode(state) {
  const { projectId, bestChunk, patchedCode, prompt } = state;

  console.log(`[secondPrompt/updateDBNode] Patching file in MongoDB...`);

  if (!projectId) {
    console.error("[secondPrompt/updateDBNode] Error: No projectId.");
    throw new Error("[updateDBNode] projectId is required.");
  }
  if (!bestChunk) {
    console.error("[secondPrompt/updateDBNode] Error: No bestChunk found in state.");
    throw new Error("[updateDBNode] bestChunk is required.");
  }
  if (patchedCode === null || patchedCode === undefined) {
    console.error("[secondPrompt/updateDBNode] Error: patchedCode is null.");
    throw new Error("[updateDBNode] patchedCode is required.");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    console.error(`[secondPrompt/updateDBNode] Project ${projectId} not found.`);
    throw new Error(`[updateDBNode] Project not found: ${projectId}`);
  }

  const file = project.files.find((f) => f.path === bestChunk.filePath);
  if (!file) {
    console.error(`[secondPrompt/updateDBNode] File ${bestChunk.filePath} not found in project document.`);
    throw new Error(`[updateDBNode] File not found in project: ${bestChunk.filePath}`);
  }

  const updatedContent = applyPatch(
    file.content,
    bestChunk.startLine,
    bestChunk.endLine,
    patchedCode
  );

  await project.updateFile(file._id, updatedContent);

  // Save chat history for this turn
  const summary = `I updated \`${bestChunk.filePath}\` to address your request.`;
  await project.addChatMessage("user", prompt);
  await project.addChatMessage("assistant", summary);

  console.log(`[secondPrompt/updateDBNode] Success! File ${bestChunk.filePath} updated and chat history saved.`);

  return {
    content: updatedContent,
    filePath: bestChunk.filePath,
    modifiedFiles: [bestChunk.filePath],
    updateSummary: summary,
    status: "db_updated",
  };
}

