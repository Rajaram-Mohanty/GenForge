import 'dotenv/config';
import mongoose from 'mongoose';

const ATLAS_MONGO_URI = process.env.MONGODB_URI_VECTOR;

if (!ATLAS_MONGO_URI) {
    console.error("Error: MONGODB_URI_VECTOR is not defined in .env");
    process.exit(1);
}

// Define Schema locally to avoid model compilation issues with default connection
const projectVectorSchema = new mongoose.Schema({
    projectId: mongoose.Schema.Types.ObjectId,
    type: String,
    name: String,
    content: String,
    embedding: [Number],
    filePath: String,
    createdAt: { type: Date, default: Date.now }
}, { collection: 'Projects' });

async function verifyVectors() {
    let conn;
    try {
        conn = await mongoose.createConnection(ATLAS_MONGO_URI, { dbName: 'GenForge_VectorDB' }).asPromise();
        console.log("Connected to Atlas MongoDB (GenForge_VectorDB)");

        const ProjectVector = conn.model('ProjectVector', projectVectorSchema);

        // Count total vectors
        const count = await ProjectVector.countDocuments();
        console.log(`\nTotal Vector Documents: ${count}`);

        if (count > 0) {
            // Fetch the most recent one to show structure
            const sample = await ProjectVector.findOne().sort({ createdAt: -1 });
            console.log("\n--- Most Recent Vector Sample ---");
            console.log(`Project ID: ${sample.projectId}`);
            console.log(`Type: ${sample.type}`);
            console.log(`Name: ${sample.name}`);
            console.log(`File: ${sample.filePath}`);
            console.log(`Embedding Length: ${sample.embedding ? sample.embedding.length : 'N/A'}`);
            console.log(`Content Preview: ${sample.content.substring(0, 50)}...`);
        } else {
            console.log("No vectors found. Check if the ingestion pipeline ran correctly.");
        }

    } catch (error) {
        console.error("Verification Error:", error);
    } finally {
        if (conn) await conn.close();
        process.exit(0);
    }
}

verifyVectors();
