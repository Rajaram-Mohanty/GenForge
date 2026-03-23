import { deleteVectorsForFile, insertVectors } from "../../../core/vectorDB.js";

/**
 * PATH 2 — Node 9: updateVDBNode
 *
 * Replaces the old vector embeddings for the patched file with fresh ones.
 * This keeps the RAG index in sync with the updated source code.
 *
 * Input state keys:  projectId, filePath, vectorDocs
 * Output state keys: status
 */
export async function updateVDBNode(state) {
  const { projectId, filePath, vectorDocs } = state;

  console.log(`[secondPrompt/updateVDBNode] Syncing updated vectors to Atlas MongoDB...`);

  if (!projectId) {
    console.error("[secondPrompt/updateVDBNode] Error: No projectId.");
    throw new Error("[secondPrompt/updateVDBNode] projectId is required.");
  }
  if (!filePath) {
    console.error("[secondPrompt/updateVDBNode] Error: No filePath.");
    throw new Error("[secondPrompt/updateVDBNode] filePath is required.");
  }

  // Delete stale vectors for this file
  try {
    await deleteVectorsForFile(projectId, filePath);
    console.log(`[secondPrompt/updateVDBNode] Deleted old vectors for: ${filePath}`);

    // Insert fresh vectors
    if (Array.isArray(vectorDocs) && vectorDocs.length > 0) {
      await insertVectors(vectorDocs);
      console.log(`[secondPrompt/updateVDBNode] Success! Inserted ${vectorDocs.length} fresh vectors for: ${filePath}`);
    } else {
      console.warn(`[secondPrompt/updateVDBNode] No new vectors were provided for: ${filePath}`);
    }
  } catch (err) {
    console.error(`[secondPrompt/updateVDBNode] FAILED to update VDB for ${filePath}:`, err.message);
    throw err;
  }

  console.log(`[secondPrompt/updateVDBNode] Done. Status: complete`);

  return { status: "done" };
}

