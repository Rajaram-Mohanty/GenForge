import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getEmbeddings } from "../../../core/embeddings.js";
import path from "path";

/**
 * PATH 2 — Node 8: embedResultNode
 *
 * Chunks the updated file content and computes new embedding vectors.
 * These will replace the old vectors for the patched file in the VDB.
 *
 * Input state keys:  content (updated file), filePath, projectId, googleApiKey
 * Output state keys: vectorDocs, status
 */
export async function embedResultNode(state) {
  const { content, filePath, projectId, apiKey } = state;

  console.log(`[embedResultNode] Re-embedding patched file: ${filePath}...`);

  if (!content) throw new Error("[embedResultNode] content is required.");
  if (!filePath) throw new Error("[embedResultNode] filePath is required.");
  if (!projectId) throw new Error("[embedResultNode] projectId is required.");
  if (!apiKey) throw new Error("[embedResultNode] apiKey is required.");

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

  console.log(`[embedResultNode] Success. Generated ${vectorDocs.length} new chunks for Atlas.`);

  return {
    vectorDocs,
    status: "result_embedded",
  };
}

