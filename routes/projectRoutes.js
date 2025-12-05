import express from 'express';
import {
    generateProject,
    getProjects,
    getProject,
    getProjectData,
    addChatMessage,
    deleteProject,
    downloadProject,
    updateFile
} from '../controllers/projectController.js';

const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }
};

router.post('/generate-prompt', requireAuth, generateProject);
router.get('/projects', requireAuth, getProjects);
router.get('/project/:projectId', requireAuth, getProject);
router.get('/project-data/:projectId', requireAuth, getProjectData);
router.post('/project/:projectId/chat', requireAuth, addChatMessage);
router.delete('/project/:projectId', requireAuth, deleteProject);
router.get('/project/:projectId/download', requireAuth, downloadProject);
router.post('/update-file/:projectId', requireAuth, updateFile);

export default router;
