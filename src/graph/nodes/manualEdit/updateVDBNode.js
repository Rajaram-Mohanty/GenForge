import { deleteVectorsForFile, insertVectors } from "../../../core/vectorDB.js";

/**
 * PATH 3 — Node 4: updateVDBNode
 *
 * Replaces the old vector embeddings for the edited file with fresh ones.
 * If vectorDocs is empty (e.g. re-indexing was skipped), this is a no-op.
 *
 * Input state keys:  projectId, filePath, vectorDocs
 * Output state keys: status
 */
export async function updateVDBNode(state) {
  const { projectId, filePath, vectorDocs } = state;

  console.log(`[manualEdit/updateVDBNode] Syncing updated vectors to Atlas MongoDB...`);

  if (!projectId) {
    console.error("[manualEdit/updateVDBNode] Error: No projectId provided.");
    throw new Error("[manualEdit/updateVDBNode] projectId is required.");
  }
  if (!filePath) {
    console.error("[manualEdit/updateVDBNode] Error: No filePath provided.");
    throw new Error("[manualEdit/updateVDBNode] filePath is required.");
  }

  if (!Array.isArray(vectorDocs) || vectorDocs.length === 0) {
    console.warn("[manualEdit/updateVDBNode] Skipping VDB update: vectorDocs is empty.");
    return { status: "vdb_skipped" };
  }

  try {
    await deleteVectorsForFile(projectId, filePath);
    console.log(`[manualEdit/updateVDBNode] Deleted ${vectorDocs.length} stale vectors for: ${filePath}`);

    await insertVectors(vectorDocs);
    console.log(`[manualEdit/updateVDBNode] Success! Inserted ${vectorDocs.length} fresh vectors for: ${filePath}`);
  } catch (err) {
    console.error(`[manualEdit/updateVDBNode] FAILED to update VDB for ${filePath}:`, err.message);
    throw err;
  }

  return { status: "vdb_updated" };
}

