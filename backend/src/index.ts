console.log('🚀 Starting ChessSlack backend...');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

console.log('✅ Core modules imported');

import logger, { stream } from './utils/logger';

console.log('✅ Logger imported');

console.log('📦 Importing routes...');
console.log('  - authRoutes...');
let authRoutes: any;
try {
  authRoutes = require('./routes/authRoutes').default;
  console.log('  ✓ authRoutes loaded');
} catch (error) {
  console.error('  ✗ authRoutes FAILED:', error);
  throw error;
}
console.log('  - workspaceRoutes...');
import workspaceRoutes from './routes/workspaceRoutes';
console.log('  - channelRoutes...');
import channelRoutes from './routes/channelRoutes';
console.log('  - messageRoutes...');
import messageRoutes from './routes/messageRoutes';
console.log('  - dmRoutes...');
import dmRoutes from './routes/dmRoutes';
console.log('  - userRoutes...');
import userRoutes from './routes/userRoutes';
console.log('  - notificationRoutes...');
import notificationRoutes from './routes/notificationRoutes';
console.log('  - searchRoutes...');
import searchRoutes from './routes/searchRoutes';
console.log('  - invitationRoutes...');
import invitationRoutes from './routes/invitationRoutes';
console.log('  - draftRoutes...');
import draftRoutes from './routes/draftRoutes';
console.log('  - uploadRoutes...');
import uploadRoutes from './routes/uploadRoutes';
console.log('  - personalRoutes...');
import personalRoutes from './routes/personalRoutes';
console.log('  - documentRoutes...');
import documentRoutes from './routes/documentRoutes';
console.log('  - mindMapRoutes...');
import mindMapRoutes from './routes/mindMapRoutes';
console.log('  - crmRoutes...');
import crmRoutes from './routes/crmRoutes';
console.log('  - marketingRoutes...');
import marketingRoutes from './routes/marketingRoutes';
console.log('✅ All routes imported');

// import agentRoutes from './routes/agentRoutes';
// import taskRoutes from './routes/taskRoutes';
// import artifactRoutes from './routes/artifactRoutes';

console.log('📦 Importing utilities and middleware...');
import { verifyToken } from './utils/jwt';
import pool from './database/db';
import { apiLimiter } from './middleware/rateLimiter';
import { sanitizeInput } from './middleware/sanitize';
import { errorHandler } from './middleware/errorHandler';
import { asyncHandler } from './utils/asyncHandler';
console.log('✅ Utilities imported');
// import { setupAgentSocketHandlers, setupAgentClientHandlers } from './sockets/agentSocket';

console.log('⚙️ Configuring environment...');
dotenv.config();

console.log('🏗️ Creating Express app and HTTP server...');
const app = express();
const httpServer = createServer(app);
console.log('✅ App and server created');

// Ensure uploads directory exists
console.log('📁 Ensuring uploads directory exists...');
import fs from 'fs';
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
  console.log('✅ Created uploads directory');
} else {
  console.log('✅ Uploads directory already exists');
}

// Parse CORS origins from environment variable (comma-separated) or use defaults
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Setup agent WebSocket event broadcasts
// setupAgentSocketHandlers(io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174', 'https://chess-slack-production.up.railway.app'],
      connectSrc: ["'self'", 'http://localhost:3001', 'ws://localhost:3001', 'https://chess-slack-production.up.railway.app', 'wss://chess-slack-production.up.railway.app', ...corsOrigins],
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
  origin: corsOrigins,
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
// app.use('/api/workspaces', agentRoutes);
// app.use('/api/workspaces', taskRoutes);
// app.use('/api/workspaces', artifactRoutes);
app.use('/api/workspaces', messageRoutes); // Register before channelRoutes to handle download route first
app.use('/api/workspaces', channelRoutes);
app.use('/api/workspaces', notificationRoutes);
app.use('/api/workspaces', searchRoutes);
app.use('/api/workspaces', invitationRoutes);
app.use('/api/workspaces', draftRoutes);
app.use('/api/workspaces', uploadRoutes);
app.use('/api/workspaces', documentRoutes);
app.use('/api/workspaces', mindMapRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/dms', dmRoutes);
app.use('/api/users', userRoutes);

// Helper to transform relative avatar URLs to full URLs for cross-origin compatibility
const getFullAvatarUrl = (avatarUrl: string | null): string | null => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl; // Already a full URL
  }
  const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || '';
  return baseUrl ? `${baseUrl}${avatarUrl}` : avatarUrl;
};

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
        avatarUrl: getFullAvatarUrl(user.avatar_url),
        status: 'online',
      });
    });
  }

  // Setup agent-specific WebSocket handlers for this client
  // setupAgentClientHandlers(socket, userId);

  socket.on('join-workspace', async (workspaceId: string) => {
    // Validate input
    if (!workspaceId || typeof workspaceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(workspaceId)) {
      logger.warn('Invalid workspace ID in join-workspace', { socketId: socket.id, workspaceId });
      return;
    }

    // Verify user is member of workspace
    try {
      const memberCheck = await pool.query(
        'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [workspaceId, userId]
      );

      if (memberCheck.rows.length === 0) {
        logger.warn('Unauthorized workspace join attempt', { socketId: socket.id, userId, workspaceId });
        return;
      }

      socket.join(`workspace:${workspaceId}`);
      logger.debug('Socket joined workspace', { socketId: socket.id, workspaceId });
    } catch (error) {
      logger.error('Error in join-workspace', { error, socketId: socket.id });
    }
  });

  // Join user-specific room for personal notifications
  socket.join(`user:${userId}`);
  logger.debug('Socket joined user room', { socketId: socket.id, userId });

  socket.on('join-channel', async (channelId: string, callback?: (success: boolean) => void) => {
    // Validate input
    if (!channelId || typeof channelId !== 'string' || !/^[0-9a-f-]{36}$/i.test(channelId)) {
      logger.warn('Invalid channel ID in join-channel', { socketId: socket.id, channelId });
      if (callback) callback(false);
      return;
    }

    // Verify user is member of channel
    try {
      const memberCheck = await pool.query(
        'SELECT 1 FROM channel_members WHERE channel_id = $1 AND user_id = $2',
        [channelId, userId]
      );

      if (memberCheck.rows.length === 0) {
        logger.warn('Unauthorized channel join attempt', { socketId: socket.id, userId, channelId });
        if (callback) callback(false);
        return;
      }

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
    } catch (error) {
      logger.error('Error in join-channel', { error, socketId: socket.id });
      if (callback) callback(false);
    }
  });

  socket.on('leave-channel', (channelId: string) => {
    // Validate input
    if (!channelId || typeof channelId !== 'string' || !/^[0-9a-f-]{36}$/i.test(channelId)) {
      logger.warn('Invalid channel ID in leave-channel', { socketId: socket.id, channelId });
      return;
    }

    socket.leave(`channel:${channelId}`);
    logger.debug('Socket left channel', { socketId: socket.id, channelId });

    // Notify others that user left
    socket.to(`channel:${channelId}`).emit('user-left-channel', {
      user: socket.data.user,
      channelId,
    });
  });

  socket.on('join-dm', async (dmGroupId: string, callback?: (success: boolean) => void) => {
    // Validate input
    if (!dmGroupId || typeof dmGroupId !== 'string' || !/^[0-9a-f-]{36}$/i.test(dmGroupId)) {
      logger.warn('Invalid DM group ID in join-dm', { socketId: socket.id, dmGroupId });
      if (callback) callback(false);
      return;
    }

    // Verify user is member of DM group
    try {
      const memberCheck = await pool.query(
        'SELECT 1 FROM dm_group_members WHERE dm_group_id = $1 AND user_id = $2',
        [dmGroupId, userId]
      );

      if (memberCheck.rows.length === 0) {
        logger.warn('Unauthorized DM join attempt', { socketId: socket.id, userId, dmGroupId });
        if (callback) callback(false);
        return;
      }

      socket.join(`dm:${dmGroupId}`);
      logger.debug('Socket joined DM', { socketId: socket.id, dmGroupId });

      // Acknowledge join completion to sender
      if (callback) {
        callback(true);
      }
    } catch (error) {
      logger.error('Error in join-dm', { error, socketId: socket.id });
      if (callback) callback(false);
    }
  });

  socket.on('leave-dm', (dmGroupId: string) => {
    // Validate input
    if (!dmGroupId || typeof dmGroupId !== 'string' || !/^[0-9a-f-]{36}$/i.test(dmGroupId)) {
      logger.warn('Invalid DM group ID in leave-dm', { socketId: socket.id, dmGroupId });
      return;
    }

    socket.leave(`dm:${dmGroupId}`);
    logger.debug('Socket left DM', { socketId: socket.id, dmGroupId });
  });

  socket.on('typing', ({ channelId }) => {
    // Validate input
    if (!channelId || typeof channelId !== 'string' || !/^[0-9a-f-]{36}$/i.test(channelId)) {
      return;
    }

    socket.to(`channel:${channelId}`).emit('user-typing', {
      user: socket.data.user,
      channelId,
    });
  });

  socket.on('stop-typing', ({ channelId }) => {
    // Validate input
    if (!channelId || typeof channelId !== 'string' || !/^[0-9a-f-]{36}$/i.test(channelId)) {
      return;
    }

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
          avatarUrl: getFullAvatarUrl(user.avatar_url),
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
          avatarUrl: getFullAvatarUrl(user.avatar_url),
          status: 'offline',
        });
      });
    }
  });
});

// 404 handler (must come before error handler)
app.use((_req, res) => {
  return res.status(404).json({ error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '3001', 10);

httpServer.listen(PORT, '0.0.0.0', () => {
  global.serverStarted = true;
  logger.info(`Server running on port ${PORT}`);
  logger.info('WebSocket server ready');
  console.log(`✅ Server successfully started on port ${PORT}`);
});

export { io };