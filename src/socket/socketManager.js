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

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.PRODUCTION_URL,
      "https://eximexperts.in"
    ].filter(Boolean);

    if (allowedOrigins.length === 0) {
      throw new Error('No valid CORS origins configured');
    }

    this.io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
    
    logger.info('🔌 Socket.io server initialized', {
      allowedOrigins,
      transports: ['websocket', 'polling']
    });
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('No token provided'));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { company: true, role: true }
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
        userAgent: socket.handshake.headers['user-agent']
      });
      next(new Error('Authentication failed'));
    }
  }

  handleConnection(socket) {
    logger.info('✅ Socket connected', {
      userId: socket.userId,
      socketId: socket.id,
      companyId: socket.companyId,
      userRole: socket.userRole,
      ip: socket.handshake.address,
      totalConnections: this.connectedUsers.size + 1
    });
    
    this.connectedUsers.set(socket.userId, socket.id);
    this.userSockets.set(socket.id, socket.userId);

    if (socket.companyId) {
      socket.join(`company_${socket.companyId}`);
    }

    socket.join(`user_${socket.userId}`);

    socket.on('disconnect', (reason) => {
      logger.info('❌ Socket disconnected', {
        userId: socket.userId,
        socketId: socket.id,
        reason,
        totalConnections: this.connectedUsers.size - 1
      });
      this.connectedUsers.delete(socket.userId);
      this.userSockets.delete(socket.id);
    });

    socket.on('get_notifications', this.handleGetNotifications.bind(this, socket));
    socket.on('get_unread_count', this.handleGetUnreadCount.bind(this, socket));
    socket.on('mark_notification_read', this.handleMarkNotificationRead.bind(this, socket));
    socket.on('mark_all_notifications_read', this.handleMarkAllNotificationsRead.bind(this, socket));
  }

  async handleGetNotifications(socket, data) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = data || {};
      const skip = (page - 1) * limit;
      
      let whereClause;
      
      if (socket.userRole === 'SUPER_ADMIN') {
        // Super Admin sees all notifications
        whereClause = {};
      } else {
        // Regular users see their own + company notifications
        whereClause = {
          OR: [
            { userId: socket.userId },
            { userId: null, companyId: socket.companyId }
          ]
        };
      }

      if (unreadOnly) {
        whereClause.isRead = false;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          include: {
            creator: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.notification.count({ where: whereClause })
      ]);

      socket.emit('notifications_data', {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('❌ Failed to fetch notifications', {
        userId: socket.userId,
        error: error.message,
        data
      });
      socket.emit('notifications_error', { message: 'Failed to fetch notifications' });
    }
  }

  async handleGetUnreadCount(socket) {
    try {
      let whereClause;
      
      if (socket.userRole === 'SUPER_ADMIN') {
        // Super Admin sees all notifications
        whereClause = {
          isRead: false
        };
      } else {
        // Regular users see their own + company notifications
        whereClause = {
          OR: [
            { userId: socket.userId },
            { userId: null, companyId: socket.companyId }
          ],
          isRead: false
        };
      }
      
      const count = await prisma.notification.count({
        where: whereClause
      });

      socket.emit('unread_count_data', { count });
    } catch (error) {
      logger.error('❌ Failed to fetch unread count', {
        userId: socket.userId,
        error: error.message
      });
      socket.emit('unread_count_error', { message: 'Failed to fetch unread count' });
    }
  }

  async handleMarkNotificationRead(socket, data) {
    try {
      const { notificationId } = data;
      
      let whereClause;
      
      if (socket.userRole === 'SUPER_ADMIN') {
        // Super Admin can mark any notification as read
        whereClause = { id: notificationId };
      } else {
        // Regular users can only mark their own notifications
        whereClause = {
          id: notificationId,
          OR: [
            { userId: socket.userId },
            { userId: null, companyId: socket.companyId }
          ]
        };
      }
      
      await prisma.notification.update({
        where: whereClause,
        data: { 
          isRead: true,
          readAt: new Date()
        }
      });

      socket.emit('notification_marked_read', { notificationId });
      logger.info('📖 Notification marked as read', {
        userId: socket.userId,
        notificationId
      });
    } catch (error) {
      logger.error('❌ Failed to mark notification as read', {
        userId: socket.userId,
        notificationId: data?.notificationId,
        error: error.message
      });
    }
  }

  async handleMarkAllNotificationsRead(socket) {
    try {
      let whereClause;
      
      if (socket.userRole === 'SUPER_ADMIN') {
        // Super Admin can mark all notifications as read
        whereClause = {
          isRead: false
        };
      } else {
        // Regular users can only mark their own notifications
        whereClause = {
          OR: [
            { userId: socket.userId },
            { userId: null, companyId: socket.companyId }
          ],
          isRead: false
        };
      }
      
      await prisma.notification.updateMany({
        where: whereClause,
        data: { 
          isRead: true,
          readAt: new Date()
        }
      });

      socket.emit('all_notifications_marked_read');
      logger.info('📖 All notifications marked as read', {
        userId: socket.userId
      });
    } catch (error) {
      logger.error('❌ Failed to mark all notifications as read', {
        userId: socket.userId,
        error: error.message
      });
    }
  }

  async sendToUser(userId, notification) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('new_notification', notification);
      logger.info('📤 Notification sent to user', {
        userId,
        notificationId: notification.id,
        title: notification.title
      });
    } else {
      logger.warn('⚠️ User not connected for notification', {
        userId,
        notificationId: notification.id
      });
    }
  }

  async sendToCompany(companyId, notification) {
    this.io.to(`company_${companyId}`).emit('new_notification', notification);
    logger.info('📤 Notification sent to company', {
      companyId,
      notificationId: notification.id,
      title: notification.title
    });
  }

  async sendToSuperAdmin(notification) {
    const superAdmins = await prisma.user.findMany({
      where: {
        role: {
          name: 'SUPER_ADMIN'
        }
      }
    });

    superAdmins.forEach(admin => {
      const socketId = this.connectedUsers.get(admin.id);
      if (socketId) {
        this.io.to(socketId).emit('new_notification', notification);
      }
    });
  }

  async createAndSendNotification({
    companyId,
    userId = null,
    createdBy,
    type,
    title,
    message,
    entityType = null,
    entityId = null,
    metadata = null,
    priority = 'MEDIUM'
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          companyId,
          userId,
          createdBy,
          type,
          title,
          message,
          entityType,
          entityId,
          metadata,
          priority
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (userId) {
        await this.sendToUser(userId, notification);
      } else {
        await this.sendToCompany(companyId, notification);
      }

      await this.sendToSuperAdmin(notification);

      logger.info('🔔 Notification created and sent', {
        notificationId: notification.id,
        type,
        title,
        companyId,
        userId,
        priority
      });
      
      return notification;
    } catch (error) {
      logger.error('❌ Failed to create notification', {
        type,
        title,
        companyId,
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

export default new SocketManager();