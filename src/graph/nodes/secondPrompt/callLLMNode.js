import { getLLM } from "../../../core/llm.js";

/**
 * PATH 2 — Node 5: callLLMNode
 *
 * Sends the augmented prompt to the LLM and captures the raw code response.
 *
 * Input state keys:  augmentedPrompt, apiKey
 * Output state keys: patchedCode, status
 */
export async function callLLMNode(state) {
  const { augmentedPrompt, apiKey } = state;

  console.log(`[secondPrompt/callLLMNode] Invoking LLM for patch generation...`);

  if (!augmentedPrompt) {
    console.error("[secondPrompt/callLLMNode] Error: augmentedPrompt is missing.");
    throw new Error("[secondPrompt/callLLMNode] augmentedPrompt is required.");
  }
  if (!apiKey) {
    console.error("[secondPrompt/callLLMNode] Error: apiKey is missing.");
    throw new Error("[secondPrompt/callLLMNode] apiKey is required.");
  }

  const llm = getLLM(apiKey, { title: "GenForge RAG Patch" });
  
  try {
    const response = await llm.invoke(augmentedPrompt);
    let text = response.content;

    if (!text) {
      console.warn("[secondPrompt/callLLMNode] LLM returned empty content.");
      text = "// Error: no code generated";
    }

    console.log(`[secondPrompt/callLLMNode] Received patch response (${text.length} chars).`);

    return {
      patchedCode: text,
      status: "llm_done",
    };
  } catch (err) {
    console.error(`[secondPrompt/callLLMNode] LLM INVOCATION FAILED:`, err.message);
    throw err;
  }
}

