import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level up from services)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import mongoose from 'mongoose';
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// --- Configuration ---
const LOCAL_MONGO_URI = process.env.MONGODB_URI;
const ATLAS_MONGO_URI = process.env.MONGODB_URI_VECTOR;
const DEFAULT_DELAY_MS = 2000; // Reduced delay since we are not using LLM for chunking

if (!ATLAS_MONGO_URI) {
    console.error("Error: MONGODB_URI_VECTOR is not defined in .env");
    process.exit(1);
}

// --- Schemas ---

// 1. Project Schema (For Local DB)
const fileSchema = new mongoose.Schema({
    name: String,
    content: String,
    language: String,
    extension: String,
    path: String,
    fileType: { type: String, default: 'text' },
    filename: String
});

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    userId: mongoose.Schema.Types.ObjectId,
    files: [fileSchema],
    chats: [],
    settings: {},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'Projects' });

// 2. ProjectVector Schema (For Atlas DB)
const projectVectorSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['function', 'class', 'component', 'file', 'chunk', 'other'],
        required: true
    },
    name: { type: String, required: true },
    content: { type: String, required: true },
    embedding: {
        type: [Number], // 768 dimensions
        required: true
    },
    filePath: { type: String, required: true },
    startLine: Number,
    endLine: Number,
    createdAt: { type: Date, default: Date.now }
}, { collection: 'Projects' });

// --- Database Connections ---
let localConn;
let atlasConn;
let LocalProjectModel;
let AtlasVectorModel;

async function initConnections() {
    if (!localConn) {
        localConn = await mongoose.createConnection(LOCAL_MONGO_URI).asPromise();
        console.log("Connected to Local MongoDB");
        LocalProjectModel = localConn.model('Project', projectSchema);
    }
    if (!atlasConn) {
        atlasConn = await mongoose.createConnection(ATLAS_MONGO_URI, { dbName: 'GenForge_VectorDB' }).asPromise();
        console.log("Connected to Atlas MongoDB (GenForge_VectorDB)");
        AtlasVectorModel = atlasConn.model('ProjectVector', projectVectorSchema);
    }
}

// --- Helper Functions ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff(fn, retries = 5, fallbackDelay = 5000) {
    let currentDelay = fallbackDelay;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            const errorMessage = error.message || "";
            if (errorMessage.includes("429") || errorMessage.includes("Quota exceeded")) {
                console.warn(`    ! Rate limit hit (Attempt ${i + 1}/${retries}).`);
                const match = errorMessage.match(/Please retry in (\d+(\.\d+)?)s/);
                let waitTime = currentDelay;
                if (match && match[1]) {
                    waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 2000;
                    console.warn(`    ! API requested wait: ${match[1]}s. Sleeping for ${(waitTime / 1000).toFixed(1)}s...`);
                    currentDelay = fallbackDelay;
                } else {
                    console.warn(`    ! No wait time specified. Sleeping for ${(waitTime / 1000).toFixed(1)}s...`);
                    currentDelay *= 1.5;
                }
                await sleep(waitTime);
            } else {
                throw error;
            }
        }
    }
    throw new Error(`Failed after ${retries} retries.`);
}

function getEmbeddings() {
    if (process.env.GOOGLE_API_KEY) {
        return new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GOOGLE_API_KEY,
            modelName: "text-embedding-004"
        });
    }
    throw new Error("No GOOGLE_API_KEY found for Embeddings.");
}

// --- Local Chunking Logic ---
// --- Local Chunking Logic (Recursive Character Splitting) ---
async function splitDocument(content, filename) {
    const ext = path.extname(filename).toLowerCase();

    let language;
    switch (ext) {
        case '.js':
        case '.jsx':
        case '.ts':
        case '.tsx':
            language = "js";
            break;
        case '.py':
            language = "python";
            break;
        case '.java':
            language = "java";
            break;
        case '.html':
            language = "html";
            break;
        // case '.css': // CSS not supported by fromLanguage in this version
        //     language = "css";
        //     break;
        default:
            language = null; // Default to generic splitter
    }

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

    const docs = await splitter.createDocuments([content]);

    // Map back to our chunk format
    return docs.map((doc, index) => ({
        type: 'chunk', // Recursive splitter doesn't give us semantic types like 'function' easily without AST
        name: `${path.basename(filename)} - Chunk ${index + 1}`,
        content: doc.pageContent,
        startLine: doc.metadata.loc ? doc.metadata.loc.lines.from : undefined
    }));
}

// --- State Definition ---
const stateChannels = {
    projectId: {
        value: (x, y) => y || x,
        default: () => null
    },
    status: {
        value: (x, y) => y,
        default: () => "start"
    }
};

// --- Nodes ---

// Unified Node: Retrieve -> Chunk (Local) -> Embed -> Store (Sequentially)
async function processProjectFiles(state) {
    console.log("--- Node: Process Project Files Sequentially (Recursive Chunking) ---");
    const { projectId } = state;
    await initConnections();

    // 1. Retrieve Project
    const project = await LocalProjectModel.findById(projectId);
    if (!project) throw new Error(`Project not found in Local DB: ${projectId}`);
    console.log(`Retrieved project: ${project.name} (${project.files.length} files)`);

    // 2. Clear existing vectors
    await AtlasVectorModel.deleteMany({ projectId: projectId });
    console.log("Cleared existing vectors for this project.");

    const embeddingsModel = getEmbeddings();

    // 3. Process Files One by One
    for (const [index, file] of project.files.entries()) {
        if (!['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.py', '.java'].includes(path.extname(file.filename))) {
            continue;
        }

        console.log(`\n[${index + 1}/${project.files.length}] Processing file: ${file.filename}`);

        // A. Recursive Chunking
        let fileChunks = [];
        try {
            fileChunks = await splitDocument(file.content, file.filename);

            // Normalize chunks
            fileChunks = fileChunks.map(chunk => ({
                ...chunk,
                filePath: file.path
            }));

        } catch (e) {
            console.error(`Error chunking ${file.filename}:`, e.message);
            fileChunks = [{
                type: "file",
                name: file.filename,
                content: file.content,
                filePath: file.path
            }];
        }

        console.log(`  - Generated ${fileChunks.length} chunks (Recursive).`);

        // B. Embed and Store Immediately
        if (fileChunks.length > 0) {
            const texts = fileChunks.map(c => c.content);
            console.log(`    > Debug: Embedding ${texts.length} texts. First text preview: "${texts[0].substring(0, 50)}..."`);

            try {
                // Embeddings API call (Higher limits, but still safe to retry)
                const embeddings = await retryWithBackoff(async () => {
                    return await embeddingsModel.embedDocuments(texts);
                }, 5, 2000);

                console.log(`    > Debug: Received ${embeddings ? embeddings.length : 'null'} embeddings.`);
                if (embeddings && embeddings.length > 0) {
                    console.log(`    > Debug: First embedding length: ${embeddings[0] ? embeddings[0].length : 'null'}`);
                }

                const vectorDocs = fileChunks.map((chunk, idx) => ({
                    projectId: projectId,
                    type: chunk.type,
                    name: chunk.name,
                    content: chunk.content,
                    embedding: embeddings[idx],
                    filePath: chunk.filePath,
                    startLine: chunk.startLine
                }));

                await AtlasVectorModel.insertMany(vectorDocs);
                console.log(`  - Stored ${vectorDocs.length} vectors.`);

            } catch (e) {
                console.error(`  - Embedding/Storage Error for ${file.filename}:`, e.message);
            }
        }

        // C. Small courtesy delay
        if (index < project.files.length - 1) {
            await sleep(DEFAULT_DELAY_MS);
        }
    }

    return { status: "completed" };
}

// --- Graph Construction ---
const workflow = new StateGraph({ channels: stateChannels });

workflow.addNode("process_files", processProjectFiles);

workflow.setEntryPoint("process_files");
workflow.addEdge("process_files", END);

// --- Execution ---
async function main() {
    const app = workflow.compile();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

    console.log("\n--- RAG Ingestion Pipeline (Local Chunking + Atlas) ---");

    if (!process.env.GOOGLE_API_KEY) {
        const apiKey = await askQuestion("Enter GOOGLE_API_KEY: ");
        process.env.GOOGLE_API_KEY = apiKey.trim();
    }

    const projectId = await askQuestion("Enter Project ID to ingest: ");

    if (!projectId) {
        console.error("Project ID is required.");
        process.exit(1);
    }

    const inputs = { projectId: projectId.trim() };

    try {
        console.log("\nStarting ingestion...");
        const result = await app.invoke(inputs);
        console.log("\nPipeline Finished Successfully.");
    } catch (error) {
        console.error("Pipeline Failed:", error);
    }

    if (localConn) await localConn.close();
    if (atlasConn) await atlasConn.close();
    rl.close();
    process.exit(0);
}

main().catch(console.error);
