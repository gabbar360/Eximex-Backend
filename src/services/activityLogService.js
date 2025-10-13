import { prisma } from '../config/dbConfig.js';
import { DatabaseUtils } from '../utils/dbUtils.js';

const logActivity = async (activityData) => {
  try {
    const {
      companyId,
      userId,
      action,
      entityType,
      entityId,
      entityName,
      description,
      metadata,
      ipAddress,
      userAgent,
    } = activityData;

    await DatabaseUtils.create('activityLog', {
      companyId,
      userId,
      action,
      entityType,
      entityId,
      entityName,
      description,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking main operations
  }
};

const getActivityLogs = async (companyId, options = {}) => {
  const {
    page = 1,
    limit = 50,
    userId,
    entityType,
    action,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const where = { companyId };

  if (userId) where.userId = parseInt(userId);
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const include = {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
  };

  return await DatabaseUtils.findMany('activityLog', {
    where,
    include,
    orderBy: { [sortBy]: sortOrder },
    page: Number(page),
    limit: Number(limit),
  });
};

const getUserActivityStats = async (companyId, userId) => {
  const where = { companyId };
  if (userId) where.userId = parseInt(userId);

  const [totalActivities, recentActivities] = await Promise.all([
    DatabaseUtils.count('activityLog', where),
    DatabaseUtils.findMany('activityLog', {
      where,
      orderBy: { createdAt: 'desc' },
      page: 1,
      limit: 10,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    }),
  ]);

  return {
    totalActivities,
    recentActivities: recentActivities.data,
  };
};

// Middleware to automatically log activities
const createActivityLogger = (entityType) => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const action = getActionFromMethod(req.method);
        const entityId = req.params.id ? parseInt(req.params.id) : null;

        // Extract entity name from response if available
        let entityName = null;
        try {
          const responseData = JSON.parse(data);
          if (responseData.data && responseData.data.name) {
            entityName = responseData.data.name;
          } else if (responseData.data && responseData.data.companyName) {
            entityName = responseData.data.companyName;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }

        logActivity({
          companyId: req.user.companyId,
          userId: req.user.id,
          action,
          entityType,
          entityId,
          entityName,
          description: `${action} ${entityType}${entityName ? `: ${entityName}` : ''}`,
          metadata: {
            method: req.method,
            url: req.originalUrl,
            body: req.method !== 'GET' ? req.body : null,
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
        });
      }

      originalSend.call(this, data);
    };

    next();
  };
};

const getActionFromMethod = (method) => {
  switch (method) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'GET':
      return 'VIEW';
    default:
      return 'UNKNOWN';
  }
};

export const ActivityLogService = {
  logActivity,
  getActivityLogs,
  getUserActivityStats,
  createActivityLogger,
};
