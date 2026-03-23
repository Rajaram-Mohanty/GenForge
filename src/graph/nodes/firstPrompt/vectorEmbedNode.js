import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getEmbeddings } from "../../../core/embeddings.js";
import path from "path";

/**
 * Chunks file content using RecursiveCharacterTextSplitter,
 * then produces embeddings for each chunk.
 *
 * @param {string} filePath
 * @param {string} content
 * @param {object} embeddingsModel
 * @param {string} projectId
 * @returns {Promise<Array>} Array of vector documents ready for insertMany
 */
async function embedFile(filePath, content, embeddingsModel, projectId) {
  const ext = path.extname(filePath).toLowerCase();
  let language = null;
  if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) language = "js";
  else if (ext === ".py") language = "python";
  else if (ext === ".html") language = "html";

  const splitter = language
    ? RecursiveCharacterTextSplitter.fromLanguage(language, {
        chunkSize: 1000,
        chunkOverlap: 200,
      })
    : new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });

  const docs = await splitter.createDocuments([content]);
  const texts = docs.map((d) => d.pageContent);
  const embeddings = await embeddingsModel.embedDocuments(texts);

  console.log(`[embedFile] Chunked "${filePath}" into ${docs.length} chunks. Snippet: "${content.substring(0, 50).replace(/\n/g, " ")}..."`);

  return docs.map((doc, idx) => ({
    projectId,
    type: "chunk",
    name: `${path.basename(filePath)} - Chunk ${idx + 1}`,
    content: doc.pageContent,
    embedding: embeddings[idx],
    filePath,
    startLine: doc.metadata.loc?.lines.from,
    endLine: doc.metadata.loc?.lines.to,
  }));
}

/**
 * PATH 1 — Node 5: vectorEmbedNode
 *
 * Iterates over every file in fileOperations and produces embedding vectors
 * for each chunk. The resulting vector documents are stored in state.
 *
 * Input state keys:  fileOperations, projectId, googleApiKey
 * Output state keys: vectorDocs (array of pre-built vector documents), status
 */
export async function vectorEmbedNode(state) {
  const { fileOperations, projectId, apiKey } = state;

  console.log(`[vectorEmbedNode] Starting Vector Embedding... (projectId: ${projectId}, files count: ${Array.isArray(fileOperations) ? fileOperations.length : 0})`);

  if (!apiKey) {
    console.error("[vectorEmbedNode] Error: No apiKey provided.");
    throw new Error("[vectorEmbedNode] apiKey is required.");
  }
  if (!projectId) {
    console.error("[vectorEmbedNode] Error: No projectId provided.");
    throw new Error("[vectorEmbedNode] projectId is required.");
  }

  const embeddingsModel = getEmbeddings(apiKey);
  const allVectorDocs = [];

  for (const fileOp of fileOperations) {
    if (!fileOp.content || !fileOp.path) {
      console.log(`[vectorEmbedNode] Skipping empty/invalid file: ${fileOp.path || "unknown"}`);
      continue;
    }
    try {
      const docs = await embedFile(fileOp.path, fileOp.content, embeddingsModel, projectId);
      allVectorDocs.push(...docs);
      console.log(`[vectorEmbedNode] Successfully embedded file: ${fileOp.path} (${docs.length} chunks)`);
    } catch (err) {
      console.error(`[vectorEmbedNode] FAILED to embed ${fileOp.path}:`, err.message);
    }
  }

  console.log(`[vectorEmbedNode] Total embedding session complete. Generated ${allVectorDocs.length} vector chunks.`);

  return {
    vectorDocs: allVectorDocs,
    status: "vectors_ready",
  };
}

