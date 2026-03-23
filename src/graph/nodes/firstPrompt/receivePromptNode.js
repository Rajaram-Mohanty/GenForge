/**
 * PATH 1 — Node 1: receivePromptNode
 *
 * Entry point for the First Prompt (Generation) path.
 * Validates the incoming prompt and seeds the graph state.
 *
 * Input state keys:  prompt, projectId, userId, apiKey, googleApiKey
 * Output state keys: status (sets to "prompt_received")
 */
export async function receivePromptNode(state) {
  const { prompt, projectId, userId, apiKey } = state;

  console.log(`[receivePromptNode] Starting... (projectId: ${projectId || "new"}, userId: ${userId})`);

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    console.error("[receivePromptNode] Error: No prompt provided.");
    throw new Error("[receivePromptNode] A non-empty prompt is required.");
  }
  if (!apiKey) {
    console.error("[receivePromptNode] Error: No apiKey provided.");
    throw new Error("[receivePromptNode] apiKey is required (used for both LLM and embeddings).");
  }

  console.log(`[receivePromptNode] Received prompt: "${prompt.substring(0, 60)}..."`);
  console.log(`[receivePromptNode] Done. Status: prompt_received`);

  return {
    status: "prompt_received",
  };
}

