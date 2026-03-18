import mongoose from 'mongoose';

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
}, { collection: 'Projects' }); // Note: Still using 'Projects' collection, might be confusing if it shares collection name. Probably meant 'ProjectVectors' or similar. 
// However, reusing collection name with Mongoose models can be tricky if discriminator isn't used.
// Based on ragIngestion.js, it seems it connects to a DIFFERENT DATABASE (VECTOR_DB) but uses collection 'Projects'. 
// So collection name 'Projects' is correct within the VECTOR_DB context.

const ProjectVector = mongoose.model('ProjectVector', projectVectorSchema);

export { projectVectorSchema }; // Export schema for reuse in different connections
export default ProjectVector;
