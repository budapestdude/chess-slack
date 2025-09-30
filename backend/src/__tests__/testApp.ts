import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/authRoutes';
import messageRoutes from '../routes/messageRoutes';
import channelRoutes from '../routes/channelRoutes';

// Create a test Express app without socket.io and database migrations
export const createTestApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/channels', channelRoutes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};