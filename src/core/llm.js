import { ChatOpenAI } from "@langchain/openai";

/**
 * Creates and returns a ChatOpenAI instance pointed at OpenRouter.
 * This is the single source of truth for LLM configuration across all graph nodes.
 *
 * @param {string} apiKey - The OpenRouter API key.
 * @param {object} [options] - Optional overrides (e.g., maxTokens, temperature).
 * @returns {ChatOpenAI}
 */
export function getLLM(apiKey, options = {}) {
  if (!apiKey) {
    throw new Error("[core/llm] API key is required to create an LLM instance.");
  }

  return new ChatOpenAI({
    modelName: process.env.MODEL_NAME || "google/gemini-2.0-flash-001",
    apiKey,
    maxTokens: options.maxTokens ?? 8000,
    temperature: options.temperature ?? 0,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://genforge.com",
        "X-Title": options.title ?? "GenForge Agent",
      },
    },
  });
}
