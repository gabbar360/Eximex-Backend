import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/dbConfig.js';
import { logger } from '../config/logger.js';

let io = null;
const connectedUsers = new Map();
const userSockets = new Map();

export const initializeSocket = (server) => {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET is required for production');
  }

  io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
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

    // Send unread notifications count on connect
    sendUnreadNotificationsCount(socket.userId);

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

    // Notification events
    socket.on('mark_notification_read', async (notificationId) => {
      await markNotificationAsRead(notificationId, socket.userId);
    });

    socket.on('mark_all_notifications_read', async () => {
      await markAllNotificationsAsRead(socket.userId);
    });

    // Basic ping-pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  logger.info('🔌 Socket.io server initialized', {
    cors: 'all origins allowed',
    transports: ['websocket', 'polling'],
  });
  

};

// Notification functions
export const sendNotificationToUser = async (userId, notification) => {
  const socketId = connectedUsers.get(userId);
  if (socketId && io) {
    io.to(socketId).emit('new_notification', notification);
  }
};

export const sendUnreadNotificationsCount = async (userId) => {
  const count = await prisma.notification.count({
    where: { receiverId: userId, isRead: false }
  });
  
  const socketId = connectedUsers.get(userId);
  if (socketId && io) {
    io.to(socketId).emit('unread_notifications_count', count);
  }
};

export const markNotificationAsRead = async (notificationId, userId) => {
  await prisma.notification.update({
    where: { id: notificationId, receiverId: userId },
    data: { isRead: true, readAt: new Date() }
  });
  
  sendUnreadNotificationsCount(userId);
};

export const markAllNotificationsAsRead = async (userId) => {
  await prisma.notification.deleteMany({
    where: { receiverId: userId }
  });
  
  sendUnreadNotificationsCount(userId);
};

export const createNotification = async (data) => {
  const notification = await prisma.notification.create({
    data,
    include: {
      sender: { select: { name: true, email: true } },
      receiver: { select: { name: true, email: true } }
    }
  });

  await sendNotificationToUser(notification.receiverId, notification);
  
  return notification;
};

export const getIO = () => io;