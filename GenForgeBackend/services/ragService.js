import { GoogleGenAI } from '@google/genai';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Project } from '../models/index.js';
import mongoose from 'mongoose';
import path from 'path';

// Atlas Connection for Vector Search
let atlasConn = null;
let AtlasProjectVector = null;

const getAtlasModel = async () => {
    if (AtlasProjectVector) return AtlasProjectVector;

    const ATLAS_URI = process.env.MONGODB_URI_VECTOR;
    if (!ATLAS_URI) throw new Error("MONGODB_URI_VECTOR is not defined");

    if (!atlasConn) {
        atlasConn = await mongoose.createConnection(ATLAS_URI, { dbName: 'GenForge_VectorDB' }).asPromise();
        console.log("Connected to Atlas MongoDB (GenForge_VectorDB)");
    }

    // Define schema here or import it. Since we need it bound to this connection:
    const projectVectorSchema = new mongoose.Schema({
        projectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        type: { type: String, enum: ['function', 'class', 'component', 'file', 'chunk', 'other'], required: true },
        name: { type: String, required: true },
        content: { type: String, required: true },
        embedding: { type: [Number], required: true },
        filePath: { type: String, required: true },
        startLine: Number,
        endLine: Number,
        createdAt: { type: Date, default: Date.now }
    }, { collection: 'Projects' });

    AtlasProjectVector = atlasConn.model('ProjectVector', projectVectorSchema);
    return AtlasProjectVector;
};

// Initialize Gemini API
const getGenAI = () => {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY is required");
    }
    return new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
};

// Initialize Embeddings Model
const getEmbeddingsModel = () => {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY is required for embeddings");
    }
    return new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: "text-embedding-004"
    });
};

/**
 * Find relevant code chunks using vector search
 * @param {string} query - User's search query
 * @param {string} projectId - Project ID to search within
 * @returns {Promise<Array>} - Array of relevant vector documents
 */
export async function findRelevantCode(query, projectId) {
    try {
        console.log(`ragService: Getting embeddings for query: "${query}"`);
        const embeddingsModel = getEmbeddingsModel();
        const queryEmbedding = await embeddingsModel.embedQuery(query);
        console.log(`ragService: Embedding generated. Length: ${queryEmbedding.length}`);

        const VectorModel = await getAtlasModel();
        console.log(`ragService: Got Atlas model. Running vector search for project: ${projectId}`);

        // DEBUG: Check if data exists and what format it is in
        try {
            const count = await VectorModel.countDocuments({ projectId: new mongoose.Types.ObjectId(projectId) });
            console.log(`ragService: DEBUG - Standard count for ObjectId(${projectId}): ${count}`);

            if (count === 0) {
                const countStr = await VectorModel.countDocuments({ projectId: projectId.toString() });
                console.log(`ragService: DEBUG - Standard count for String("${projectId}"): ${countStr}`);
            }
        } catch (err) {
            console.error("ragService: DEBUG - Error checking counts:", err);
        }

        // Using MongoDB Atlas Vector Search
        // Note: We are trying "default" as the index name, which is standard.
        const searchPromise = VectorModel.aggregate([
            {
                $vectorSearch: {
                    index: "GenForge",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 50,
                    limit: 3,
                    filter: {
                        projectId: { $eq: new mongoose.Types.ObjectId(projectId) }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    filePath: 1,
                    startLine: 1,
                    endLine: 1,
                    content: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ]);

        // Implement manual timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Vector search timed out after 10s")), 10000)
        );

        const results = await Promise.race([searchPromise, timeoutPromise]);

        console.log(`ragService: Vector search complete. Found ${results.length} results.`);
        return results;
    } catch (error) {
        console.error("Error in findRelevantCode:", error);
        throw error;
    }
}

/**
 * Generate a code patch using LLM
 * @param {string} originalCode - The code block to be modified
 * @param {string} userPrompt - The user's instruction
 * @returns {Promise<string>} - The new code block
 */
export async function generatePatch(originalCode, userPrompt) {
    try {
        const genAI = getGenAI();

        const prompt = `
You are an expert code editor.
User Request: "${userPrompt}"

Original Code:
\`\`\`javascript
${originalCode}
\`\`\`

Task: Rewrite the Original Code to satisfy the User Request.
Rules:
1. Return ONLY the new code.
2. Do not include markdown backticks like \`\`\`javascript.
3. Maintain indentation and style.
4. Do not add comments unless requested.
`;

        // Using the SDK pattern from server.js
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }]
        });

        let text = response.text;
        if (!text && response.response && typeof response.response.text === 'function') {
            text = response.response.text();
        } else if (!text && response.candidates && response.candidates[0] && response.candidates[0].content) {
            text = response.candidates[0].content.parts[0].text;
        }

        if (!text) {
            console.warn("Unexpected response format from Gemini:", JSON.stringify(response));
            text = "// Error generating code";
        }

        // Clean up markdown if present
        text = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');

        return text.trim();
    } catch (error) {
        console.error("Error in generatePatch:", error);
        throw error;
    }
}

/**
 * Apply the patch to the full file content
 * @param {string} fullContent - The entire file content
 * @param {number} startLine - 1-based start line of the chunk
 * @param {number} endLine - 1-based end line of the chunk
 * @param {string} newCode - The new code to insert
 * @returns {string} - The updated full file content
 */
export function applyPatch(fullContent, startLine, endLine, newCode) {
    const lines = fullContent.split('\n');

    // Convert 1-based to 0-based index
    // startLine is inclusive, endLine is inclusive
    // If startLine is undefined (e.g. whole file), handle gracefully
    if (!startLine || !endLine) {
        console.warn("Missing line numbers for patch, attempting fuzzy match or append (Not implemented, returning newCode)");
        return newCode; // Fallback: replace everything if we don't know where
    }

    const startIndex = Math.max(0, startLine - 1);
    const endIndex = Math.min(lines.length - 1, endLine - 1);
    const deleteCount = endIndex - startIndex + 1;

    console.log(`Patching lines ${startLine}-${endLine} (Indices ${startIndex}-${endIndex})`);

    // Splice: Remove old lines, insert new code
    // Note: newCode might be multiple lines, so we shouldn't just insert it as one array element
    // unless we want it to be one line. Usually split it too.
    const newLines = newCode.split('\n');

    lines.splice(startIndex, deleteCount, ...newLines);

    return lines.join('\n');
}

/**
 * Re-index a file after modification
 * @param {string} projectId 
 * @param {string} filePath 
 * @param {string} newContent 
 */
export async function reIndexFile(projectId, filePath, newContent) {
    try {
        console.log(`Re-indexing file: ${filePath}`);

        // 1. Delete old vectors
        const VectorModel = await getAtlasModel();
        await VectorModel.deleteMany({
            projectId: projectId,
            filePath: filePath
        });

        // 2. Chunk the new content
        // We need to determine language for splitter
        const ext = path.extname(filePath).toLowerCase();
        let language = null;
        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) language = "js";
        else if (ext === '.py') language = "python";
        else if (ext === '.html') language = "html";

        let splitter;
        if (language) {
            splitter = RecursiveCharacterTextSplitter.fromLanguage(language, {
                chunkSize: 1000,
                chunkOverlap: 200,
            });
        } else {
            splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
        }

        const docs = await splitter.createDocuments([newContent]);

        // 3. Generate Embeddings
        const embeddingsModel = getEmbeddingsModel();
        const texts = docs.map(d => d.pageContent);

        // Batch embedding might be needed for large files, but for single file update it's likely fine
        const embeddings = await embeddingsModel.embedDocuments(texts);

        // 4. Store new vectors
        const vectorDocs = docs.map((doc, idx) => ({
            projectId: projectId,
            type: 'chunk', // We default to chunk for now
            name: `${path.basename(filePath)} - Chunk ${idx + 1}`,
            content: doc.pageContent,
            embedding: embeddings[idx],
            filePath: filePath,
            startLine: doc.metadata.loc ? doc.metadata.loc.lines.from : undefined,
            endLine: doc.metadata.loc ? doc.metadata.loc.lines.to : undefined
        }));

        if (vectorDocs.length > 0) {
            await VectorModel.insertMany(vectorDocs);
            console.log(`Successfully re-indexed ${vectorDocs.length} chunks for ${filePath}`);
        }

    } catch (error) {
        console.error("Error in reIndexFile:", error);
        // Don't throw here, we don't want to fail the user request if background indexing fails
        // But we should log it.
    }
}
