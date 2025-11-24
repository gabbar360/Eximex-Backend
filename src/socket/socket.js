import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/dbConfig.js';
import { logger } from '../config/logger.js';

class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
    this.userSockets = new Map();
  }

  initialize(server) {
    // Validate required environment variables
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error('ACCESS_TOKEN_SECRET is required for production');
    }

    const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);

    if (allowedOrigins.length === 0) {
      throw new Error('No valid CORS origins configured');
    }

    this.io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    const io = this.io;
    const connectedUsers = this.connectedUsers;
    const userSockets = this.userSockets;

    io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('No token provided'));
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: { company: true, role: true },
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.companyId = user.companyId;
        socket.userRole = user.role?.name;
        socket.user = user;

        next();
      } catch (error) {
        logger.warn('🚫 Socket authentication failed', {
          error: error.message,
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'],
        });
        next(new Error('Authentication failed'));
      }
    });

    // Connection handling
    io.on('connection', (socket) => {
      logger.info('✅ Socket connected', {
        userId: socket.userId,
        socketId: socket.id,
        companyId: socket.companyId,
        userRole: socket.userRole,
        ip: socket.handshake.address,
        totalConnections: connectedUsers.size + 1,
      });

      connectedUsers.set(socket.userId, socket.id);
      userSockets.set(socket.id, socket.userId);

      if (socket.companyId) {
        socket.join(`company_${socket.companyId}`);
      }

      socket.join(`user_${socket.userId}`);

      socket.on('disconnect', (reason) => {
        logger.info('❌ Socket disconnected', {
          userId: socket.userId,
          socketId: socket.id,
          reason,
          totalConnections: connectedUsers.size - 1,
        });
        connectedUsers.delete(socket.userId);
        userSockets.delete(socket.id);
      });

      // Basic ping-pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });

    logger.info('🔌 Socket.io server initialized', {
      allowedOrigins,
      transports: ['websocket', 'polling'],
    });
  }

  // Basic method to send message to user (for future use)
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      logger.info('📤 Message sent to user', {
        userId,
        event,
      });
    }
  }

  // Basic method to send message to company (for future use)
  sendToCompany(companyId, event, data) {
    this.io.to(`company_${companyId}`).emit(event, data);
    logger.info('📤 Message sent to company', {
      companyId,
      event,
    });
  }
}

export default new SocketManager();
