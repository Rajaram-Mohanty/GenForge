import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getEmbeddings } from "../../../core/embeddings.js";
import path from "path";

/**
 * PATH 3 — Node 3: reIndexNode
 *
 * Chunks the new file content and generates fresh embedding vectors.
 * Does NOT touch the database yet — that's handled by updateVDBNode.
 *
 * Input state keys:  content, filePath, projectId, googleApiKey
 * Output state keys: vectorDocs, status
 */
export async function reIndexNode(state) {
  const { content, filePath, projectId, apiKey } = state;

  console.log(`[reIndexNode] Starting RAG Re-indexing for: ${filePath}...`);

  if (!content) throw new Error("[reIndexNode] content is required.");
  if (!filePath) throw new Error("[reIndexNode] filePath is required.");
  if (!projectId) throw new Error("[reIndexNode] projectId is required.");

  if (!apiKey) {
    // No API key — skip re-indexing gracefully
    console.warn("[reIndexNode] Skipping re-indexing: No apiKey provided.");
    return { vectorDocs: [], status: "reindex_skipped" };
  }

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

  const embeddingsModel = getEmbeddings(apiKey);
  const embeddings = await embeddingsModel.embedDocuments(texts);

  const vectorDocs = docs.map((doc, idx) => ({
    projectId,
    type: "chunk",
    name: `${path.basename(filePath)} - Chunk ${idx + 1}`,
    content: doc.pageContent,
    embedding: embeddings[idx],
    filePath,
    startLine: doc.metadata.loc?.lines.from,
    endLine: doc.metadata.loc?.lines.to,
  }));

  console.log(`[reIndexNode] Done. Chunks generated: ${vectorDocs.length} for ${filePath}`);

  return { vectorDocs, status: "reindexed" };
}

