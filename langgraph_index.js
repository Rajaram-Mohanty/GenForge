import 'dotenv/config';
import mongoose from 'mongoose';
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import readline from 'readline';
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const LOCAL_MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/genforge";
const ATLAS_MONGO_URI = process.env.MONGODB_URI_VECTOR;

if (!ATLAS_MONGO_URI) {
    console.error("Error: MONGODB_URI_VECTOR is not defined in .env");
    process.exit(1);
}

// --- Schemas (Re-defined to bind to specific connections) ---

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
});

// 2. ProjectVector Schema (For Atlas DB)
const projectVectorSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['function', 'class', 'component', 'file', 'other'],
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
}, { collection: 'genforge_vectorDB' });

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
        atlasConn = await mongoose.createConnection(ATLAS_MONGO_URI).asPromise();
        console.log("Connected to Atlas MongoDB");
        AtlasVectorModel = atlasConn.model('ProjectVector', projectVectorSchema);
    }
}

// --- Model Setup ---
function getModel() {
    if (process.env.GOOGLE_API_KEY) {
        return new ChatGoogleGenerativeAI({
            model: "gemini-2.0-flash-exp",
            temperature: 0,
            apiKey: process.env.GOOGLE_API_KEY
        });
    }
    throw new Error("No GOOGLE_API_KEY found.");
}

function getEmbeddings() {
    if (process.env.GOOGLE_API_KEY) {
        return new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GOOGLE_API_KEY,
            modelName: "embedding-001"
        });
    }
    throw new Error("No GOOGLE_API_KEY found for Embeddings.");
}

// --- State Definition ---
const stateChannels = {
    projectId: {
        value: (x, y) => y || x,
        default: () => null
    },
    projectFiles: {
        value: (x, y) => y || x,
        default: () => []
    },
    chunks: {
        value: (x, y) => y || x,
        default: () => []
    },
    status: {
        value: (x, y) => y,
        default: () => "start"
    }
};

// --- Nodes ---

// 1. Retrieve Project from Local DB
async function retrieveProject(state) {
    console.log("--- Node: Retrieve Project (Local) ---");
    const { projectId } = state;
    await initConnections();

    const project = await LocalProjectModel.findById(projectId);
    if (!project) throw new Error(`Project not found in Local DB: ${projectId}`);

    console.log(`Retrieved project: ${project.name} (${project.files.length} files)`);
    return { projectFiles: project.files };
}

// 2. Semantic Chunking (Gemini)
async function semanticChunking(state) {
    console.log("--- Node: Semantic Chunking ---");
    const { projectFiles } = state;
    const model = getModel();
    const allChunks = [];

    for (const file of projectFiles) {
        if (!['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.py', '.java'].includes(path.extname(file.filename))) {
            continue;
        }

        console.log(`Chunking file: ${file.filename}`);

        const prompt = `
        Analyze the following code file: "${file.filename}"
        
        CODE:
        ${file.content}
        
        Extract all logical units: functions, classes, and major components.
        Return a JSON ARRAY of objects. Each object must have:
        - "type": "function" | "class" | "component" | "other"
        - "name": Name of the unit
        - "content": The exact code block
        - "startLine": approximate start line number (optional)
        
        If the file is small or has no distinct functions, return the whole file as one chunk with type "file".
        Ensure valid JSON output only. No markdown formatting.
        `;

        try {
            const response = await model.invoke([new HumanMessage(prompt)]);
            let content = response.content.replace(/```json/g, "").replace(/```/g, "").trim();

            const fileChunks = JSON.parse(content);

            fileChunks.forEach(chunk => {
                chunk.filePath = file.path;
                allChunks.push(chunk);
            });

        } catch (e) {
            console.error(`Error chunking ${file.filename}:`, e.message);
            allChunks.push({
                type: "file",
                name: file.filename,
                content: file.content,
                filePath: file.path
            });
        }
    }

    console.log(`Generated ${allChunks.length} semantic chunks.`);
    return { chunks: allChunks };
}

// 3. Embed and Store (Atlas DB)
async function embedAndStore(state) {
    console.log("--- Node: Embed and Store (Atlas) ---");
    const { chunks, projectId } = state;
    const embeddingsModel = getEmbeddings();

    await initConnections();

    // Clear existing vectors for this project in Atlas
    await AtlasVectorModel.deleteMany({ projectId: projectId });

    const vectorDocs = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const texts = batch.map(c => c.content);

        try {
            const embeddings = await embeddingsModel.embedDocuments(texts);

            batch.forEach((chunk, idx) => {
                vectorDocs.push({
                    projectId: projectId,
                    type: chunk.type,
                    name: chunk.name,
                    content: chunk.content,
                    embedding: embeddings[idx],
                    filePath: chunk.filePath,
                    startLine: chunk.startLine
                });
            });
            console.log(`Embedded batch ${i / BATCH_SIZE + 1}`);
        } catch (e) {
            console.error("Embedding Error:", e.message);
        }
    }

    if (vectorDocs.length > 0) {
        await AtlasVectorModel.insertMany(vectorDocs);
        console.log(`Stored ${vectorDocs.length} vectors in MongoDB Atlas.`);
    }

    return { status: "completed" };
}

// --- Graph Construction ---
const workflow = new StateGraph({ channels: stateChannels });

workflow.addNode("retrieve", retrieveProject);
workflow.addNode("chunk", semanticChunking);
workflow.addNode("embed_store", embedAndStore);

workflow.setEntryPoint("retrieve");
workflow.addEdge("retrieve", "chunk");
workflow.addEdge("chunk", "embed_store");
workflow.addEdge("embed_store", END);

// --- Execution ---
async function main() {
    const app = workflow.compile();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

    console.log("\n--- RAG Ingestion Pipeline (Dual DB) ---");

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
