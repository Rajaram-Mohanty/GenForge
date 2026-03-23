/**
 * PATH 2 — Node 1: receivePromptNode
 *
 * Entry point for the Second Prompt (RAG Update) path.
 * Validates that both a prompt and a projectId are present in state.
 *
 * Input state keys:  prompt, projectId, apiKey, googleApiKey
 * Output state keys: status
 */
export async function receivePromptNode(state) {
  const { prompt, projectId, apiKey } = state;

  console.log(`[secondPrompt/receivePromptNode] Starting RAG Update Flow... (projectId: ${projectId})`);

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    console.error("[secondPrompt/receivePromptNode] Error: No prompt provided.");
    throw new Error("[secondPrompt/receivePromptNode] A non-empty prompt is required.");
  }
  if (!projectId) {
    console.error("[secondPrompt/receivePromptNode] Error: No projectId provided.");
    throw new Error("[secondPrompt/receivePromptNode] projectId is required.");
  }
  if (!apiKey) {
    console.error("[secondPrompt/receivePromptNode] Error: No apiKey provided.");
    throw new Error("[secondPrompt/receivePromptNode] apiKey is required (used for both LLM and embeddings).");
  }

  console.log(`[secondPrompt/receivePromptNode] Received prompt: "${prompt.substring(0, 60)}..." for project: ${projectId}`);
  console.log(`[secondPrompt/receivePromptNode] Done. Status: prompt_received`);

  return { status: "prompt_received" };
}

