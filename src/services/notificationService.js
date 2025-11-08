import { PrismaClient } from '@prisma/client';
import socketManager from '../socket/socketManager.js';

const prisma = new PrismaClient();

class NotificationService {
  // Create activity notification
  async createActivityNotification({
    companyId,
    userId,
    createdBy,
    action,
    entityType,
    entityId,
    entityName,
    description,
    metadata = {}
  }) {
    try {
      const title = this.generateTitle(action, entityType, entityName);
      const message = description || this.generateMessage(action, entityType, entityName);

      return await socketManager.createAndSendNotification({
        companyId,
        userId: null, // Company-wide notification
        createdBy,
        type: 'USER_ACTIVITY',
        title,
        message,
        entityType,
        entityId,
        metadata: {
          action,
          ...metadata
        },
        priority: this.getPriority(action, entityType)
      });
    } catch (error) {
      console.error('Error creating activity notification:', error);
      throw error;
    }
  }

  // Create system notification
  async createSystemNotification({
    companyId,
    userId = null,
    createdBy,
    type = 'SYSTEM_ALERT',
    title,
    message,
    priority = 'MEDIUM',
    metadata = {}
  }) {
    try {
      return await socketManager.createAndSendNotification({
        companyId,
        userId,
        createdBy,
        type,
        title,
        message,
        metadata,
        priority
      });
    } catch (error) {
      console.error('Error creating system notification:', error);
      throw error;
    }
  }

  // Get notifications for user
  async getUserNotifications(userId, companyId, userRole, { page = 1, limit = 20, unreadOnly = false } = {}) {
    try {
      const skip = (page - 1) * limit;
      
      let where;
      
      // SUPER_ADMIN can see all notifications across all companies
      if (userRole === 'SUPER_ADMIN') {
        where = {}; // No restrictions for SUPER_ADMIN
      } else {
        // Regular users see their own notifications + company-wide notifications
        where = {
          OR: [
            { userId: userId },
            { userId: null, companyId: companyId }
          ]
        };
      }

      if (unreadOnly) {
        where.isRead = false;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          include: {
            creator: {
              select: { id: true, name: true, email: true }
            },
            company: {
              select: { id: true, companyName: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.notification.count({ where })
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount(userId, companyId, userRole) {
    try {
      let where;
      
      // SUPER_ADMIN can see all unread notifications
      if (userRole === 'SUPER_ADMIN') {
        where = {
          isRead: false
        };
      } else {
        // Regular users see their own + company-wide unread notifications
        where = {
          OR: [
            { userId: userId },
            { userId: null, companyId: companyId }
          ],
          isRead: false
        };
      }
      
      return await prisma.notification.count({ where });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId, companyId, userRole) {
    try {
      let where = { id: notificationId };
      
      // SUPER_ADMIN can mark any notification as read
      if (userRole !== 'SUPER_ADMIN') {
        where.OR = [
          { userId: userId },
          { userId: null, companyId: companyId }
        ];
      }
      
      return await prisma.notification.update({
        where,
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId, companyId, userRole) {
    try {
      let where;
      
      // SUPER_ADMIN can mark all notifications as read
      if (userRole === 'SUPER_ADMIN') {
        where = {
          isRead: false
        };
      } else {
        // Regular users can only mark their accessible notifications as read
        where = {
          OR: [
            { userId: userId },
            { userId: null, companyId: companyId }
          ],
          isRead: false
        };
      }
      
      return await prisma.notification.updateMany({
        where,
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Helper methods
  generateTitle(action, entityType, entityName) {
    const actionMap = {
      CREATE: 'Created',
      UPDATE: 'Updated',
      DELETE: 'Deleted',
      VIEW: 'Viewed',
      LOGIN: 'Logged in',
      LOGOUT: 'Logged out'
    };

    const typeMap = {
      Party: 'Party',
      Product: 'Product',
      Category: 'Category',
      PiInvoice: 'PI Invoice',
      PiProduct: 'PI Product',
      Order: 'Order',
      VGM: 'VGM Document',
      PurchaseOrder: 'Purchase Order',
      PackingList: 'Packing List',
      PackagingHierarchy: 'Packaging Hierarchy',
      PackagingUnit: 'Packaging Unit',
      PackagingConvert: 'Unit Conversion',
      Role: 'Role',
      DataAssignment: 'Data Assignment',
      Auth: 'Authentication',
      Payment: 'Payment',
      User: 'User',
      Company: 'Company'
    };

    const actionText = actionMap[action] || action;
    const typeText = typeMap[entityType] || entityType;
    
    if (entityName) {
      return `${actionText} ${typeText}: ${entityName}`;
    }
    
    return `${actionText} ${typeText}`;
  }

  generateMessage(action, entityType, entityName) {
    const actionMap = {
      CREATE: 'created',
      UPDATE: 'updated',
      DELETE: 'deleted',
      VIEW: 'viewed',
      LOGIN: 'logged in',
      LOGOUT: 'logged out'
    };

    const actionText = actionMap[action] || action.toLowerCase();
    
    if (entityName) {
      return `${entityType} "${entityName}" has been ${actionText}`;
    }
    
    return `A ${entityType} has been ${actionText}`;
  }

  getPriority(action, entityType) {
    // High priority actions
    if (['DELETE', 'LOGIN', 'LOGOUT'].includes(action)) {
      return 'HIGH';
    }
    
    // Medium priority for important entities
    if (['PiInvoice', 'PiProduct', 'Order', 'PurchaseOrder', 'PackingList', 'Role', 'DataAssignment', 'Payment', 'User', 'Company'].includes(entityType)) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }
}

export default new NotificationService();