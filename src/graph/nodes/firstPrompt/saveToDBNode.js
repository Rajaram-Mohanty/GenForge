import { Project } from "../../../models/index.js";
import { User } from "../../../models/index.js";

/**
 * Generates a short, human-readable project name from the first 6 words of the prompt.
 *
 * @param {string} prompt
 * @returns {string}
 */
function generateProjectName(prompt) {
  if (!prompt || typeof prompt !== "string") {
    return `Project ${new Date().toLocaleDateString()}`;
  }
  const words = prompt.trim().split(/\s+/).slice(0, 6);
  let name = words.join(" ");
  if (name.length > 50) name = name.substring(0, 47) + "...";
  if (name.length < 3) return `Project ${new Date().toLocaleDateString()}`;
  return name;
}

/**
 * PATH 1 — Node 4: saveToDBNode
 *
 * Creates a new Project document in MongoDB, adds the user prompt as a chat
 * message, and persists every file from fileOperations.
 * The resulting project._id is stored in state for downstream nodes.
 *
 * Input state keys:  userId, prompt, fileOperations, agentMessages, finalMessage
 * Output state keys: projectId (the saved MongoDB _id as string), status
 */
export async function saveToDBNode(state) {
  const { userId, prompt, fileOperations, agentMessages, finalMessage } = state;

  console.log(`[saveToDBNode] Starting Database Persistence... (userId: ${userId})`);

  if (!userId) {
    console.error("[saveToDBNode] Error: No userId provided.");
    throw new Error("[saveToDBNode] userId is required.");
  }

  const project = new Project({
    name: generateProjectName(prompt),
    description: prompt,
    userId,
    projectType: "web-app",
  });

  // Persist initial chat messages
  await project.addChatMessage("user", prompt);

  if (agentMessages && agentMessages.length > 0) {
    for (const msg of agentMessages) {
      await project.addChatMessage("assistant", msg);
    }
  }
  if (finalMessage) {
    await project.addChatMessage("assistant", finalMessage);
  }

  // ── Consolidate File Operations ───────────────────────────────────────────
  // The agent might produce multiple operations for the same file (e.g., mkdir, touch, Set-Content).
  // We only want to save the FINAL state of each unique file path to prevent duplicates.
  const consolidated = new Map();
  if (Array.isArray(fileOperations)) {
    for (const op of fileOperations) {
      if (op.path && op.type !== "create_directory") {
        const existing = consolidated.get(op.path) || {};
        consolidated.set(op.path, {
          path: op.path,
          name: op.name || existing.name || op.path.split(/[/\\]/).pop(),
          content: op.content !== undefined ? op.content : (existing.content ?? ""),
        });
      }
    }
  }

  // Add each unique file to the MongoDB document
  const finalFileOps = Array.from(consolidated.values());
  for (const file of finalFileOps) {
    const ext = file.name.split(".").pop() || "txt";
    await project.addFile(file.name, file.path, file.content, ext);
    console.log(`[saveToDBNode] File saved: ${file.path} (${file.content.length} bytes)`);
  }

  await project.save();
  console.log(`[saveToDBNode] Success! Project created with ID: ${project._id}. Written ${finalFileOps.length} files.`);

  return {
    projectId: project._id.toString(),
    fileOperations: finalFileOps, // Update state with consolidated list
    status: "saved_to_db",
  };
}

