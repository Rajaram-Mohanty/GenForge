import mongoose from 'mongoose';

const projectVectorSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['function', 'class', 'component', 'file', 'chunk', 'other'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    embedding: {
        type: [Number], // 768 dimensions for Gemini text-embedding-004
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    startLine: Number,
    endLine: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'Projects' }); // Explicit collection name

const ProjectVector = mongoose.model('ProjectVector', projectVectorSchema);

export default ProjectVector;
