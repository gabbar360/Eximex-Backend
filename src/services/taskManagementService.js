import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';

export const taskManagementService = {
  // Create task (Admin only)
  async createTask(taskData, assignerId) {
    const { title, description, priority, dueDate, assignedTo } = taskData;
    
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

    return await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedBy: assignerId,
        assignedTo,
        companyId: assigner.companyId
      },
      include: {
        assigner: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } }
      }
    });
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
          where,
          include: {
            assigner: { select: { name: true, email: true } },
            assignee: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: Number((pageNum - 1) * limitNum),
          take: Number(limitNum)
        }),
        prisma.task.count({ where })
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

  // Update task status (Staff can update their tasks)
  async updateTaskStatus(taskId, status, userId) {
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        OR: [
          { assignedTo: userId },
          { assignedBy: userId }
        ]
      }
    });

    if (!task) {
      throw new ApiError(404, 'Task not found or access denied');
    }

    const updateData = { status };
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    return await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assigner: { select: { name: true, email: true } },
        assignee: { select: { name: true, email: true } }
      }
    });
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
      }
    });

    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    return { message: 'Task deleted successfully' };
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