import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import cors from 'cors';

import { connectDB } from './models/index.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Enable CORS for React frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://genforge.onrender.com',
    process.env.CLIENT_ORIGIN
  ].filter(Boolean),
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'genforge-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/', authRoutes);
app.use('/api', projectRoutes);
app.use('/api', userRoutes);

// --- Serve Frontend (Vite build) ---
app.use(express.static(path.join(__dirname, "GenForgeFrontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "GenForgeFrontend/dist/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});