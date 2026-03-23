/**
 * PATH 3 — Node 5: syncUINode
 *
 * The final node of the Manual Editor Save path.
 * Packages the operation result into a clean response object that
 * the controller can directly return to the frontend.
 *
 * Input state keys:  filePath, projectId, status
 * Output state keys: syncResult, status ("done")
 */
export async function syncUINode(state) {
  const { filePath, projectId, status: prevStatus } = state;

  console.log(`[syncUINode] Finalizing manual edit flow...`);

  const vdbSynced = prevStatus === "vdb_updated";

  const syncResult = {
    success: true,
    filePath,
    projectId,
    message: `File updated successfully in database.`,
    reIndexed: vdbSynced,
    reIndexMessage: vdbSynced
      ? "Re-indexed file for RAG"
      : "Skipped RAG indexing (no API key or empty content)",
  };

  console.log(`[syncUINode] Manual edit flow COMPLETED for: ${filePath} | Project: ${projectId} | RAG re-indexed: ${vdbSynced}`);

  return {
    syncResult,
    status: "done",
  };
}

