import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import notificationService from './notificationService.js';

export const taskManagementService = {
  // Create task (Admin only)
  async createTask(taskData, assignerId) {
    const { title, description, type, priority, dueDate, assignedTo, slaHours } = taskData;
    
    const assigner = await prisma.user.findUnique({
      where: { id: assignerId },
      include: { role: true }
    });

    if (!['ADMIN', 'SUPER_ADMIN'].includes(assigner.role?.name)) {
      throw new ApiError(403, 'Only admins can assign tasks');
    }

    const assignee = await prisma.user.findFirst({
      where: { 
        id: assignedTo, 
        companyId: assigner.companyId,
        role: { name: 'STAFF' }
      }
    });

    if (!assignee) {
      throw new ApiError(404, 'Staff member not found');
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        type,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        slaHours,
        createdBy: assignerId,
        assignedBy: assignerId,
        assignedTo,
        companyId: assigner.companyId
      },
      include: {
        creator: { select: { name: true, email: true } },
        assigner: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } }
      }
    });

    // Create notification for task assignment
    await notificationService.createTaskAssignedNotification(task, assignerId);

    return task;
  },

  // Get tasks (Admin sees all, Staff sees only assigned)
  async getTasks(userId, options = {}) {
    console.log('🔍 getTasks called with:', { userId, options });
    
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search = ''
    } = options;
    
    console.log('📊 Raw parameters:', { page, limit, status, priority, search });
    console.log('📊 Parameter types:', { 
      page: typeof page, 
      limit: typeof limit, 
      status: typeof status, 
      priority: typeof priority, 
      search: typeof search 
    });
    
    // Convert to integers like category service
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    
    console.log('🔢 Converted parameters:', { pageNum, limitNum });
    console.log('🔢 Converted types:', { pageNum: typeof pageNum, limitNum: typeof limitNum });
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    console.log('👤 User found:', { id: user?.id, role: user?.role?.name, companyId: user?.companyId });

    const where = { companyId: user.companyId };
    
    // Staff can only see their assigned tasks
    if (user.role?.name === 'STAFF') {
      where.assignedTo = userId;
    }

    if (status && status !== '') where.status = status;
    if (priority && priority !== '') where.priority = priority;
    if (search && search !== '') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    console.log('🔍 Where clause:', JSON.stringify(where, null, 2));
    console.log('📄 Pagination params for Prisma:', { skip: (pageNum - 1) * limitNum, take: limitNum });

    try {
      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where: { ...where, isActive: true },
          include: {
            creator: { select: { name: true, email: true } },
            assigner: { select: { name: true, email: true } },
            assignee: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: Number((pageNum - 1) * limitNum),
          take: Number(limitNum)
        }),
        prisma.task.count({ where: { ...where, isActive: true } })
      ]);

      console.log('✅ Query successful:', { tasksCount: tasks.length, total });

      return {
        data: tasks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        }
      };
    } catch (error) {
      console.error('❌ Prisma query error:', error);
      throw error;
    }
  },

  // Update complete task (Admin can update all fields, Staff can update status only)
  async updateTask(taskId, taskData, userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        companyId: user.companyId,
        OR: [
          { assignedTo: userId },
          { assignedBy: userId }
        ]
      }
    });

    if (!task) {
      throw new ApiError(404, 'Task not found or access denied');
    }

    const updateData = {};
    
    // Admin can update all fields
    if (['ADMIN', 'SUPER_ADMIN'].includes(user.role?.name)) {
      const { title, description, type, priority, dueDate, assignedTo, slaHours, status } = taskData;
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (priority !== undefined) updateData.priority = priority;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
      if (slaHours !== undefined) updateData.slaHours = slaHours;
      if (status !== undefined) updateData.status = status;
    } else {
      // Staff can only update status
      if (taskData.status !== undefined) updateData.status = taskData.status;
    }

    if (updateData.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        creator: { select: { name: true, email: true } },
        assigner: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } }
      }
    });

    // Create notifications for updates
    if (updateData.status && updateData.status !== task.status) {
      updatedTask.previousStatus = task.status;
      
      if (updateData.status === 'COMPLETED') {
        await notificationService.createTaskCompletedNotification(updatedTask, userId);
      } else {
        await notificationService.createTaskStatusUpdatedNotification(updatedTask, userId);
      }
    }
    
    // If admin updates task, notify staff (except for status-only updates by staff)
    if (['ADMIN', 'SUPER_ADMIN'].includes(user.role?.name) && Object.keys(updateData).length > 0) {
      // Only notify if there are actual changes and it's not just a status update
      const hasNonStatusUpdates = Object.keys(updateData).some(key => key !== 'status' && key !== 'completedAt');
      if (hasNonStatusUpdates || updateData.status) {
        await notificationService.createTaskUpdatedNotification(updatedTask, userId);
      }
    }

    return updatedTask;
  },

  // Get task by ID
  async getTaskById(taskId, userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    const where = { id: taskId, companyId: user.companyId };
    
    // Staff can only see their assigned tasks
    if (user.role?.name === 'STAFF') {
      where.assignedTo = userId;
    }

    const task = await prisma.task.findFirst({
      where,
      include: {
        assigner: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } }
      }
    });

    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    return task;
  },

  // Delete task (Admin only)
  async deleteTask(taskId, userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role?.name)) {
      throw new ApiError(403, 'Only admins can delete tasks');
    }

    const task = await prisma.task.findFirst({
      where: { 
        id: taskId, 
        companyId: user.companyId 
      },
      include: {
        assigner: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } }
      }
    });

    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    // Create notification before deleting task
    if (task.assignedTo) {
      await notificationService.createTaskDeletedNotification(task, userId);
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    return { message: 'Task deleted successfully...' };
  },

  // Get staff list for assignment (Admin only)
  async getStaffList(adminId) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      include: { role: true }
    });

    if (!['ADMIN', 'SUPER_ADMIN'].includes(admin.role?.name)) {
      throw new ApiError(403, 'Access denied');
    }

    return await prisma.user.findMany({
      where: {
        companyId: admin.companyId,
        role: { name: 'STAFF' },
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
  }
};