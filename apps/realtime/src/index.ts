import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import * as jose from 'jose';
import { notificationHandler } from './handlers/notifications';
import { eventHandler } from './handlers/events';
import { presenceHandler } from './handlers/presence';
import { messagingHandler } from './handlers/messaging';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET!;

// Create Express app
const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: [
    'https://aksharshruti.com',
    'https://app.aksharshruti.com',
    'http://localhost:3000',
    'capacitor://localhost',
    'ionic://localhost',
  ],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: io.sockets.sockets.size,
    },
  });
});

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://aksharshruti.com',
      'https://app.aksharshruti.com',
      'http://localhost:3000',
      'capacitor://localhost',
      'ionic://localhost',
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// JWT Authentication middleware for Socket.io
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    // Check token type
    if (payload.type !== 'access') {
      return next(new Error('Invalid token type'));
    }

    // Attach user data to socket
    socket.data.userId = payload.userId as string;
    socket.data.userEmail = payload.email as string;
    socket.data.userRole = payload.role as string;

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  const userId = socket.data.userId;
  console.log(`User connected: ${userId} (${socket.id})`);

  // Join user's personal room for notifications
  socket.join(`user:${userId}`);

  // Initialize handlers
  notificationHandler(io, socket);
  eventHandler(io, socket);
  presenceHandler(io, socket);
  messagingHandler(io, socket);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId} (${socket.id})`);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for user ${userId}:`, error);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`✅ Real-time server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { io };
