import mongoose from "mongoose";
import { projectVectorSchema } from "../models/ProjectVector.js";

/**
 * Atlas MongoDB connection singleton for vector search.
 * Lazily initialized on first call to getAtlasModel().
 */
let atlasConn = null;
let AtlasProjectVector = null;

/**
 * Returns the Mongoose model for ProjectVector, backed by Atlas.
 * Creates the connection on first call.
 *
 * @returns {Promise<mongoose.Model>}
 */
export async function getAtlasModel() {
  if (AtlasProjectVector) return AtlasProjectVector;

  const VECTOR_DB = process.env.VECTOR_DB;
  if (!VECTOR_DB) {
    throw new Error("[core/vectorDB] VECTOR_DB environment variable is not set.");
  }

  if (!atlasConn) {
    atlasConn = await mongoose.createConnection(VECTOR_DB).asPromise();
    console.log("[core/vectorDB] Connected to Atlas MongoDB (GenForge_VectorDB)");
  }

  AtlasProjectVector = atlasConn.model("ProjectVector", projectVectorSchema);
  return AtlasProjectVector;
}

/**
 * Runs an Atlas $vectorSearch query and returns the top matching chunks.
 *
 * @param {number[]} queryEmbedding - The embedding vector of the user query.
 * @param {string} projectId - The MongoDB project ID to scope the search.
 * @param {number} [limit=3] - Max number of results to return.
 * @returns {Promise<Array>} Array of matching vector documents.
 */
export async function vectorSearch(queryEmbedding, projectId, limit = 3) {
  const VectorModel = await getAtlasModel();

  const searchPromise = VectorModel.aggregate([
    {
      $vectorSearch: {
        index: "GenForge", // CRITICAL: This must match the index name in Atlas exactly
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100, // Increase candidates to improve recall with filters
        limit,
        filter: {
          projectId: { $eq: new mongoose.Types.ObjectId(projectId) },
        },
      },
    },
    {
      $project: {
        _id: 1,
        filePath: 1,
        startLine: 1,
        endLine: 1,
        content: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("[core/vectorDB] Vector search timed out after 10s")),
      10000
    )
  );

  return Promise.race([searchPromise, timeoutPromise]);
}

/**
 * Deletes all vector records for a specific file within a project.
 *
 * @param {string} projectId
 * @param {string} filePath
 */
export async function deleteVectorsForFile(projectId, filePath) {
  const VectorModel = await getAtlasModel();
  await VectorModel.deleteMany({ projectId, filePath });
}

/**
 * Deletes all vector records for a specific project.
 *
 * @param {string} projectId
 */
export async function deleteVectorsForProject(projectId) {
  const VectorModel = await getAtlasModel();
  await VectorModel.deleteMany({ projectId });
}

/**
 * Inserts a batch of pre-built vector documents into the Atlas collection.
 *
 * @param {Array<object>} vectorDocs - Array of vector documents to insert.
 */
export async function insertVectors(vectorDocs) {
  if (!vectorDocs || vectorDocs.length === 0) return;
  try {
    const VectorModel = await getAtlasModel();
    const result = await VectorModel.insertMany(vectorDocs);
    console.log(`[core/vectorDB] Successfully inserted ${result.length} vectors into Atlas collection "Projects".`);
  } catch (error) {
    console.error(`[core/vectorDB] CRITICAL ERROR inserting vectors:`, error.message);
    throw error;
  }
}
