/**
 * PATH 3 — Node 1: receiveEditNode
 *
 * Entry point for the Manual Editor Save path.
 * Validates that the required fields (projectId, filePath, content) are present.
 *
 * Input state keys:  projectId, userId, filePath, content, apiKey, googleApiKey
 * Output state keys: status
 */
export async function receiveEditNode(state) {
  const { projectId, userId, filePath, content } = state;

  console.log(`[receiveEditNode] Starting Manual Save... (projectId: ${projectId}, userId: ${userId}, file: ${filePath})`);

  if (!projectId) {
    console.error("[receiveEditNode] Error: No projectId provided.");
    throw new Error("[receiveEditNode] projectId is required.");
  }
  if (!userId) {
    console.error("[receiveEditNode] Error: No userId provided.");
    throw new Error("[receiveEditNode] userId is required.");
  }
  if (!filePath) {
    console.error("[receiveEditNode] Error: No filePath provided.");
    throw new Error("[receiveEditNode] filePath is required.");
  }
  if (content === undefined || content === null) {
    console.error(`[receiveEditNode] Error: No content provided for ${filePath}`);
    throw new Error("[receiveEditNode] content is required.");
  }

  console.log(`[receiveEditNode] Edit received for: ${filePath} in project: ${projectId}. Content length: ${content.length} chars.`);
  console.log(`[receiveEditNode] Done. Status: edit_received`);

  return { status: "edit_received" };
}

