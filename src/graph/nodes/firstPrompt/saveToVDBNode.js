import { insertVectors } from "../../../core/vectorDB.js";

/**
 * PATH 1 — Node 6: saveToVDBNode
 *
 * Persists the pre-computed vector documents into Atlas MongoDB.
 * This is the final node of the First Prompt path.
 *
 * Input state keys:  vectorDocs
 * Output state keys: status
 */
export async function saveToVDBNode(state) {
  const { vectorDocs } = state;

  console.log(`[saveToVDBNode] Starting Vector Database Persistence... (docs count: ${Array.isArray(vectorDocs) ? vectorDocs.length : 0})`);

  if (!Array.isArray(vectorDocs) || vectorDocs.length === 0) {
    console.warn("[saveToVDBNode] No vector documents to insert. Skipping.");
    return { status: "done" };
  }

  try {
    await insertVectors(vectorDocs);
    console.log(`[saveToVDBNode] Success! Inserted ${vectorDocs.length} vectors into Atlas MongoDB. Path 1 (First Prompt) complete.`);
  } catch (err) {
    console.error(`[saveToVDBNode] CRITICAL ERROR during Atlas VDB insertion:`, err.message);
    throw err;
  }

  return { status: "done" };
}

