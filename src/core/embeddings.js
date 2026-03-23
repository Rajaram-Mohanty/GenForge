import { OpenAIEmbeddings } from "@langchain/openai";

/**
 * Creates and returns an OpenAIEmbeddings instance pointed at OpenRouter.
 * Uses OpenRouter for ALL AI operations — no Google API key needed.
 *
 * @param {string} apiKey - The OpenRouter API key.
 * @returns {OpenAIEmbeddings}
 */
export function getEmbeddings(apiKey) {
  if (!apiKey) {
    throw new Error(
      "[core/embeddings] OpenRouter API key is required to create an embeddings model."
    );
  }

  return new OpenAIEmbeddings({
    apiKey,
    modelName: process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small",
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://genforge.com",
        "X-Title": "GenForge Embeddings",
      },
    },
  });
}
