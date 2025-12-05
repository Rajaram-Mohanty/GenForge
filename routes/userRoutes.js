import express from 'express';
import { getUser, updateApiKey } from '../controllers/userController.js';

const router = express.Router();

// Middleware to check if user is authenticated (can be imported from a middleware file if shared)
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }
};

router.get('/user', requireAuth, getUser);
router.post('/update-api-key', requireAuth, updateApiKey);

export default router;
