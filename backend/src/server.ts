import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pool from './config/database';
import { errorHandler } from './middleware/errorHandler';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import bunkerRoutes from './routes/bunker';
import locationRoutes from './routes/locations';
import submissionRoutes from './routes/submissions';
import menuRoutes from './routes/menus';
import shareRoutes from './routes/shares';
import exportRoutes from './routes/exports';
import adminRoutes from './routes/admin';
import researchRoutes from './routes/research';
import supportRoutes from './routes/support';
import messagesRoutes from './routes/messages';
import notificationsRoutes from './routes/notifications';
import postsRoutes from './routes/posts';
import releaseNotesRoutes from './routes/releaseNotes';
import correctionsRoutes from './routes/corrections';
import { startAutoCloseJob } from './jobs/autoCloseTickets';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// API routes
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/bunker', bunkerRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/menus', menuRoutes);
app.use('/api/v1/shares', shareRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/research', researchRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/messages', messagesRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/posts', postsRoutes);
app.use('/api/v1/release-notes', releaseNotesRoutes);
app.use('/api/v1/corrections', correctionsRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Background jobs
startAutoCloseJob();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
