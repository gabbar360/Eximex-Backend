import { prisma } from '../config/dbConfig.js';
import { createNotification } from '../socket/socket.js';

export const notificationService = {
  // Create task assigned notification
  async createTaskAssignedNotification(task, assignerId) {

    
    const notificationData = {
      companyId: task.companyId,
      senderId: assignerId,
      receiverId: task.assignedTo,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${task.title}"`,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        taskType: task.type,
        priority: task.priority,
        dueDate: task.dueDate,
        assignerName: task.assigner?.name
      }
    };
    

    return await createNotification(notificationData);
  },

  // Create task status updated notification
  async createTaskStatusUpdatedNotification(task, updatedBy) {
    const isStatusUpdate = task.status !== task.previousStatus;
    
    if (!isStatusUpdate) return null;

    return await createNotification({
      companyId: task.companyId,
      senderId: updatedBy,
      receiverId: task.assignedBy, // Notify the assigner
      type: 'TASK_STATUS_UPDATED',
      title: 'Task Status Updated',
      message: `Task "${task.title}" status changed to ${task.status.replace('_', ' ')}`,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        oldStatus: task.previousStatus,
        newStatus: task.status,
        updatedByName: task.assignee?.name
      }
    });
  },

  // Create task completed notification
  async createTaskCompletedNotification(task, completedBy) {
    return await createNotification({
      companyId: task.companyId,
      senderId: completedBy,
      receiverId: task.assignedBy,
      type: 'TASK_COMPLETED',
      title: 'Task Completed',
      message: `Task "${task.title}" has been completed`,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        completedAt: task.completedAt,
        completedByName: task.assignee?.name
      }
    });
  },

  // Create task updated notification (admin updates task)
  async createTaskUpdatedNotification(task, updatedBy) {
    return await createNotification({
      companyId: task.companyId,
      senderId: updatedBy,
      receiverId: task.assignedTo, // Notify the assigned staff
      type: 'TASK_STATUS_UPDATED',
      title: 'Task Updated',
      message: `Your task "${task.title}" has been updated by admin`,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        taskType: task.type,
        priority: task.priority,
        status: task.status,
        updatedByName: task.assigner?.name
      }
    });
  },

  // Create task deleted notification
  async createTaskDeletedNotification(task, deletedBy) {
    return await createNotification({
      companyId: task.companyId,
      senderId: deletedBy,
      receiverId: task.assignedTo, // Notify the assigned staff
      type: 'TASK_STATUS_UPDATED',
      title: 'Task Deleted',
      message: `Your assigned task "${task.title}" has been deleted by admin`,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        taskType: task.type,
        priority: task.priority,
        deletedByName: task.assigner?.name
      }
    });
  },

  // Get notifications for user
  async getNotifications(userId, options = {}) {
    const { page = 1, limit = 20, isRead } = options;
    
    // Convert to integers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    
    const where = { receiverId: userId };
    if (isRead !== undefined) where.isRead = isRead;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          sender: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.notification.count({ where })
    ]);

    return {
      data: notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  },

  // Get unread notifications count
  async getUnreadCount(userId) {
    return await prisma.notification.count({
      where: { receiverId: userId, isRead: false }
    });
  },

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    return await prisma.notification.update({
      where: { id: notificationId, receiverId: userId },
      data: { isRead: true, readAt: new Date() }
    });
  },

  // Mark all notifications as read
  async markAllAsRead(userId) {
    return await prisma.notification.deleteMany({
      where: { receiverId: userId }
    });
  }
};

export default notificationService;