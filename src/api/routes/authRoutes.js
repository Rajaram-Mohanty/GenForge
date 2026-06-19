import express from 'express';
import { login, signup, logout, googleLogin } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/logout', logout);
router.post('/google', googleLogin);

export default router;
