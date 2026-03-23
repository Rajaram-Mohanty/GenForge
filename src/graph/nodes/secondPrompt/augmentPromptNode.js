/**
 * PATH 2 — Node 4: augmentPromptNode
 *
 * Builds the augmented prompt that will be sent to the LLM.
 * It combines the user's original request with the retrieved code block,
 * giving the LLM all the context it needs to make a precise edit.
 *
 * Input state keys:  prompt, bestChunk
 * Output state keys: augmentedPrompt, status
 */
export async function augmentPromptNode(state) {
  const { prompt, bestChunk } = state;

  console.log(`[augmentPromptNode] Constructing augmented prompt with RAG context...`);

  if (!bestChunk) {
    // No relevant chunk found — the graph's conditional edge
    // will route away from this node in that case, but guard here too.
    console.error(`[augmentPromptNode] FAILED: bestChunk is missing from state.`);
    throw new Error("[augmentPromptNode] bestChunk is required.");
  }

  const augmentedPrompt = `
You are an expert code editor.

User Request: "${prompt}"

Here is the current code block that is most relevant to the request:
\`\`\`
${bestChunk.content}
\`\`\`
(File: ${bestChunk.filePath}, Lines: ${bestChunk.startLine ?? "?"}-${bestChunk.endLine ?? "?"})

Task: Rewrite ONLY the code block above to satisfy the User Request.
Rules:
1. Return ONLY the new code — no markdown fences, no explanations.
2. Maintain the original indentation and coding style.
3. Do not add comments unless explicitly requested.
`.trim();

  console.log(
    `[augmentPromptNode] Done. Context: ${bestChunk.filePath} (score: ${bestChunk.score?.toFixed(3) ?? "n/a"})`
  );

  return {
    augmentedPrompt,
    status: "prompt_augmented",
  };
}

