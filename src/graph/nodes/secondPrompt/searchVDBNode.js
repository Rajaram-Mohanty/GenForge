import { vectorSearch } from "../../../core/vectorDB.js";

/**
 * PATH 2 — Node 3: searchVDBNode
 *
 * Runs an Atlas $vectorSearch using the prompt embedding
 * to find the most semantically relevant code chunks in the project.
 *
 * Input state keys:  promptEmbedding, projectId
 * Output state keys: relevantChunks, bestChunk, status
 */
export async function searchVDBNode(state) {
  const { promptEmbedding, projectId } = state;

  console.log(`[searchVDBNode] Starting Vector Search in project: ${projectId}...`);

  if (!promptEmbedding) {
    console.error("[searchVDBNode] Error: promptEmbedding is missing from state.");
    throw new Error("[searchVDBNode] promptEmbedding is required.");
  }
  if (!projectId) {
    console.error("[searchVDBNode] Error: projectId is missing from state.");
    throw new Error("[searchVDBNode] projectId is required.");
  }

  const results = await vectorSearch(promptEmbedding, projectId, 3);
  
  if (results.length === 0) {
    console.warn(`[searchVDBNode] No relevant chunks found for project: ${projectId}.`);
  } else {
    console.log(`[searchVDBNode] Success! Found ${results.length} relevant chunks. Best score: ${results[0].score?.toFixed(4) || "n/a"}`);
  }

  return {
    relevantChunks: results,
    bestChunk: results.length > 0 ? results[0] : null,
    status: results.length > 0 ? "chunks_found" : "no_chunks_found",
  };
}

