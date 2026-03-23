/**
 * PATH 1 — Node 3: chunkResponseNode
 *
 * Filters the raw fileOperations collected during the LLM agent loop,
 * keeping only operations that have actual file content to save.
 *
 * Input state keys:  fileOperations
 * Output state keys: fileOperations (filtered), status
 */
export async function chunkResponseNode(state) {
  const { fileOperations } = state;

  console.log(`[chunkResponseNode] Filtering file operations... (input: ${Array.isArray(fileOperations) ? fileOperations.length : 0} ops)`);

  if (!Array.isArray(fileOperations) || fileOperations.length === 0) {
    console.warn("[chunkResponseNode] No file operations to process.");
    return { fileOperations: [], status: "chunked" };
  }

  // Keep all file-creation/write operations that have a path.
  // We allow empty content (e.g., from 'touch' or 'New-Item').
  const filteredOps = fileOperations.filter(
    (op) =>
      (op.type === "write_file" || op.type === "create_file" || op.type === "file") &&
      op.path
  );

  console.log(
    `[chunkResponseNode] Raw ops count: ${fileOperations.length}, With valid file content: ${filteredOps.length}`
  );

  return {
    fileOperations: filteredOps,
    status: "chunked",
  };
}

