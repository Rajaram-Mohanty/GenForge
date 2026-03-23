/**
 * PATH 2 — Node 6: chunkResponseNode
 *
 * Cleans the raw LLM response by stripping any markdown code fences,
 * yielding a clean patch string ready to be applied to the file.
 *
 * Input state keys:  patchedCode
 * Output state keys: patchedCode (cleaned), status
 */
export async function chunkResponseNode(state) {
  const { patchedCode } = state;

  console.log(`[secondPrompt/chunkResponseNode] Cleaning LLM response...`);

  if (!patchedCode) {
    console.error("[secondPrompt/chunkResponseNode] Error: patchedCode is missing.");
    throw new Error("[secondPrompt/chunkResponseNode] patchedCode is required.");
  }

  // Strip markdown fences (```javascript ... ``` or ``` ... ```)
  // More robust extraction: find the first block and take its contents.
  let cleaned = patchedCode.trim();
  const match = patchedCode.match(/```(?:[a-z]*)\n?([\s\S]*?)```/);
  if (match) {
    cleaned = match[1].trim();
  }

  console.log(`[secondPrompt/chunkResponseNode] Patch cleaned. Final length: ${cleaned.length} chars.`);

  return {
    patchedCode: cleaned,
    status: "patch_ready",
  };
}

