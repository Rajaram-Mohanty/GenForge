import { getEmbeddings } from "../../../core/embeddings.js";

/**
 * PATH 2 — Node 2: embedPromptNode
 *
 * Converts the user prompt into a vector embedding.
 * This vector is used in the next node to search the Atlas VDB.
 *
 * Input state keys:  prompt, googleApiKey
 * Output state keys: promptEmbedding, status
 */
export async function embedPromptNode(state) {
  const { prompt, apiKey } = state;

  console.log(`[embedPromptNode] Starting prompt embedding...`);

  if (!apiKey) {
    console.error("[embedPromptNode] Error: No apiKey provided.");
    throw new Error("[embedPromptNode] apiKey is required.");
  }

  const embeddingsModel = getEmbeddings(apiKey);
  console.log(`[embedPromptNode] Embedding query: "${prompt.substring(0, 60)}..."`);

  const promptEmbedding = await embeddingsModel.embedQuery(prompt);
  console.log(`[embedPromptNode] Done. Vector dimensions: ${promptEmbedding.length}`);

  return {
    promptEmbedding,
    status: "prompt_embedded",
  };
}

