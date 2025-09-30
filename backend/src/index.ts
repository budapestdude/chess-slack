import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import logger, { stream } from './utils/logger';

import authRoutes from './routes/authRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import channelRoutes from './routes/channelRoutes';
import messageRoutes from './routes/messageRoutes';
import dmRoutes from './routes/dmRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';
import searchRoutes from './routes/searchRoutes';
import { verifyToken } from './utils/jwt';
import pool from './database/db';
import { apiLimiter } from './middleware/rateLimiter';
import { sanitizeInput } from './middleware/sanitize';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:3001', 'http://localhost:5173'],
      connectSrc: ["'self'", 'http://localhost:3001', 'ws://localhost:3001'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined', { stream }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting and input sanitization
app.use(apiLimiter);
app.use(sanitizeInput);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
logger.info('Router registration order: messageRoutes BEFORE channelRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces', messageRoutes); // Register before channelRoutes to handle download route first
app.use('/api/workspaces', channelRoutes);
app.use('/api/workspaces', notificationRoutes);
app.use('/api/workspaces', searchRoutes);
app.use('/api/dms', dmRoutes);
app.use('/api/users', userRoutes);

// WebSocket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token);

    // Fetch user from database
    const result = await pool.query(
      'SELECT id, email, username, display_name FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return next(new Error('User not found'));
    }

    socket.data.user = result.rows[0];
    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// WebSocket connection handling
io.on('connection', async (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id, username: socket.data.user?.username });

  const userId = socket.data.userId;

  // Set user as online when they connect
  if (userId) {
    await pool.query(
      `INSERT INTO user_presence (user_id, status, last_activity)
       VALUES ($1, 'online', NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET status = 'online', last_activity = NOW()`,
      [userId]
    );

    // Broadcast presence change to all workspaces
    const workspacesResult = await pool.query(
      'SELECT workspace_id FROM workspace_members WHERE user_id = $1',
      [userId]
    );

    const userResult = await pool.query(
      'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    workspacesResult.rows.forEach((row) => {
      io.in(`workspace:${row.workspace_id}`).emit('presence-changed', {
        userId: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        status: 'online',
      });
    });
  }

  socket.on('join-workspace', (workspaceId: string) => {
    socket.join(`workspace:${workspaceId}`);
    logger.debug('Socket joined workspace', { socketId: socket.id, workspaceId });
  });

  // Join user-specific room for personal notifications
  socket.join(`user:${userId}`);
  logger.debug('Socket joined user room', { socketId: socket.id, userId });

  socket.on('join-channel', (channelId: string, callback?: (success: boolean) => void) => {
    socket.join(`channel:${channelId}`);
    logger.debug('Socket joined channel', { socketId: socket.id, channelId });

    // Notify others that user joined
    socket.to(`channel:${channelId}`).emit('user-joined-channel', {
      user: socket.data.user,
      channelId,
    });

    // Acknowledge join completion to sender
    if (callback) {
      callback(true);
    }
  });

  socket.on('leave-channel', (channelId: string) => {
    socket.leave(`channel:${channelId}`);
    logger.debug('Socket left channel', { socketId: socket.id, channelId });

    // Notify others that user left
    socket.to(`channel:${channelId}`).emit('user-left-channel', {
      user: socket.data.user,
      channelId,
    });
  });

  socket.on('join-dm', (dmGroupId: string, callback?: (success: boolean) => void) => {
    socket.join(`dm:${dmGroupId}`);
    logger.debug('Socket joined DM', { socketId: socket.id, dmGroupId });

    // Acknowledge join completion to sender
    if (callback) {
      callback(true);
    }
  });

  socket.on('leave-dm', (dmGroupId: string) => {
    socket.leave(`dm:${dmGroupId}`);
    logger.debug('Socket left DM', { socketId: socket.id, dmGroupId });
  });

  socket.on('typing', ({ channelId }) => {
    socket.to(`channel:${channelId}`).emit('user-typing', {
      user: socket.data.user,
      channelId,
    });
  });

  socket.on('stop-typing', ({ channelId }) => {
    socket.to(`channel:${channelId}`).emit('user-stop-typing', {
      user: socket.data.user,
      channelId,
    });
  });

  socket.on('set-presence', async ({ status }) => {
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      return;
    }

    if (userId) {
      await pool.query(
        `UPDATE user_presence SET status = $1, last_activity = NOW() WHERE user_id = $2`,
        [status, userId]
      );

      // Broadcast presence change
      const workspacesResult = await pool.query(
        'SELECT workspace_id FROM workspace_members WHERE user_id = $1',
        [userId]
      );

      const userResult = await pool.query(
        'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
        [userId]
      );

      const user = userResult.rows[0];

      workspacesResult.rows.forEach((row) => {
        io.in(`workspace:${row.workspace_id}`).emit('presence-changed', {
          userId: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          status,
        });
      });
    }
  });

  socket.on('disconnect', async () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id });

    // Set user as offline when they disconnect
    if (userId) {
      await pool.query(
        `UPDATE user_presence SET status = 'offline', last_activity = NOW() WHERE user_id = $1`,
        [userId]
      );

      // Broadcast presence change
      const workspacesResult = await pool.query(
        'SELECT workspace_id FROM workspace_members WHERE user_id = $1',
        [userId]
      );

      const userResult = await pool.query(
        'SELECT id, username, display_name, avatar_url FROM users WHERE id = $1',
        [userId]
      );

      const user = userResult.rows[0];

      workspacesResult.rows.forEach((row) => {
        io.in(`workspace:${row.workspace_id}`).emit('presence-changed', {
          userId: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          status: 'offline',
        });
      });
    }
  });
});

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Express error handler', { error: err.message, stack: err.stack, status: err.status });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((_req, res) => {
  return res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info('WebSocket server ready');
});

export { io };