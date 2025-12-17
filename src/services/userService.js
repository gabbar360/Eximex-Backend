import bcrypt from 'bcryptjs';
import { prisma } from '../config/dbConfig.js';
import { DatabaseUtils } from '../utils/dbUtils.js';
import { cacheManager } from '../utils/cacheUtils.js';
import { ApiError } from '../utils/ApiError.js';

const getUserById = async (userId, includePassword = false) => {
  const cacheKey = `user_${userId}_${includePassword}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const select = {
    id: true,
    name: true,
    email: true,
    mobileNum: true,
    roleId: true,
    role: {
      select: {
        id: true,
        name: true,
        displayName: true
      }
    },
    status: true,
    isBlocked: true,
    lastLogin: true,
    createdAt: true,
    companyId: true,
    ...(includePassword && { password: true }),
  };

  const user = await DatabaseUtils.findOne(
    'user',
    { id: Number(userId) },
    select
  );
  if (!user) throw new ApiError(404, 'User not found');

  cacheManager.set(cacheKey, user, 10 * 60 * 1000);
  return user;
};

const getUserByEmail = async (email, includePassword = false) => {
  const select = {
    id: true,
    name: true,
    email: true,
    mobileNum: true,
    roleId: true,
    role: {
      select: {
        id: true,
        name: true,
        displayName: true
      }
    },
    status: true,
    isBlocked: true,
    lastLogin: true,
    createdAt: true,
    ...(includePassword && { password: true }),
  };

  return await DatabaseUtils.findOne(
    'user',
    { email: email.toLowerCase() },
    select
  );
};

const getAllUsers = async (options = {}, requestingUser = null) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    status = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const where = {
    status: { not: 'DELETED' },
  };

  // Scope to company if requesting user is provided
  if (requestingUser?.companyId) {
    where.companyId = requestingUser.companyId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) where.role = role;
  if (status) where.status = status;

  const orderBy = { [sortBy]: sortOrder };

  const select = {
    id: true,
    name: true,
    email: true,
    mobileNum: true,
    roleId: true,
    role: {
      select: {
        id: true,
        name: true,
        displayName: true
      }
    },
    status: true,
    isBlocked: true,
    lastLogin: true,
    createdAt: true,
    companyId: true,
  };

  return await DatabaseUtils.findMany('user', {
    where,
    select,
    orderBy,
    page: Number(page),
    limit: Number(limit),
  });
};

const createUser = async (userData, creatingUser = null) => {
  const {
    name,
    email,
    mobileNum,
    password,
    role = 'STAFF',
    companyId,
  } = userData;

  // Use creating user's company if not specified
  const targetCompanyId = companyId || creatingUser?.companyId;

  if (!targetCompanyId) {
    throw new ApiError(400, 'Company ID is required');
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        ...(mobileNum ? [{ mobileNum }] : []),
      ],
    },
  });

  if (existingUser) {
    throw new ApiError(
      409,
      'User with this email, or mobile number already exists'
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await DatabaseUtils.create('user', {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    mobileNum: mobileNum?.trim(),
    password: hashedPassword,
    role,
    companyId: targetCompanyId,
  });

  cacheManager.delete(`user_${user.id}_false`);
  cacheManager.delete(`user_${user.id}_true`);

  return user;
};

const updateUser = async (userId, updateData, updatingUser = null) => {
  const { name, email, mobileNum, roleId, status, companyId } = updateData;

  const existingUser = await getUserById(userId);
  if (!existingUser) throw new ApiError(404, 'User not found');

  // Ensure user belongs to same company (for non-super-admins)
  if (updatingUser && updatingUser.role?.name !== 'SUPER_ADMIN') {
    if (existingUser.companyId !== updatingUser.companyId) {
      throw new ApiError(403, 'Cannot update user from different company');
    }
  }

  if (email || mobileNum) {
    const conflictUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email: email.toLowerCase() }] : []),
          ...(mobileNum ? [{ mobileNum }] : []),
        ],
        NOT: { id: Number(userId) },
      },
    });

    if (conflictUser) {
      throw new ApiError(409, 'Email or mobile number already exists');
    }
  }

  const updateFields = {};
  if (name) updateFields.name = name.trim();
  if (email) updateFields.email = email.toLowerCase().trim();
  if (mobileNum) updateFields.mobileNum = mobileNum.trim();
  if (roleId) updateFields.roleId = Number(roleId);
  if (status) updateFields.status = status;
  
  // Only SUPER_ADMIN can update companyId
  if (companyId && updatingUser?.role?.name === 'SUPER_ADMIN') {
    updateFields.companyId = Number(companyId);
  }

  const updatedUser = await prisma.user.update({
    where: { id: Number(userId) },
    data: updateFields,
    include: {
      role: {
        select: {
          id: true,
          name: true,
          displayName: true
        }
      }
    }
  });

  cacheManager.delete(`user_${userId}_false`);
  cacheManager.delete(`user_${userId}_true`);

  return updatedUser;
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await getUserById(userId, true);

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordValid) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  await DatabaseUtils.update(
    'user',
    { id: Number(userId) },
    { password: hashedNewPassword }
  );

  cacheManager.delete(`user_${userId}_false`);
  cacheManager.delete(`user_${userId}_true`);

  return { message: 'Password changed successfully' };
};

const deleteUser = async (userId) => {
  const user = await getUserById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  await DatabaseUtils.transaction(async (tx) => {
    // Hard delete all products created by this user
    await tx.product.deleteMany({
      where: {
        createdBy: Number(userId),
        companyId: user.companyId,
      },
    });

    // Mark user as deleted
    await tx.user.update({
      where: { id: Number(userId) },
      data: { status: 'DELETED' },
    });
  });

  cacheManager.delete(`user_${userId}_false`);
  cacheManager.delete(`user_${userId}_true`);

  return { message: 'User and associated products deleted successfully' };
};

const updateLastLogin = async (userId) => {
  await DatabaseUtils.update(
    'user',
    { id: Number(userId) },
    { lastLogin: new Date() }
  );

  cacheManager.delete(`user_${userId}_false`);
  cacheManager.delete(`user_${userId}_true`);
};

const getUserStats = async (companyId = null) => {
  const cacheKey = companyId ? `user_stats_${companyId}` : 'user_stats_global';
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const baseWhere = companyId ? { companyId } : {};

  const [totalUsers, activeUsers, staffUsers, adminUsers] = await Promise.all([
    DatabaseUtils.count('user', { ...baseWhere, status: { not: 'DELETED' } }),
    DatabaseUtils.count('user', { ...baseWhere, status: 'ACTIVE' }),
    DatabaseUtils.count('user', {
      ...baseWhere,
      role: { name: 'STAFF' },
      status: { not: 'DELETED' },
    }),
    DatabaseUtils.count('user', {
      ...baseWhere,
      role: { name: 'ADMIN' },
      status: { not: 'DELETED' },
    }),
  ]);

  const stats = {
    totalUsers,
    activeUsers,
    staffUsers,
    adminUsers,
    inactiveUsers: totalUsers - activeUsers,
  };

  cacheManager.set(cacheKey, stats, 5 * 60 * 1000);
  return stats;
};

const bulkUpdateStatus = async (userIds, status) => {
  const result = await DatabaseUtils.transaction(async (tx) => {
    const updates = await Promise.all(
      userIds.map((id) =>
        tx.user.update({
          where: { id },
          data: { status },
        })
      )
    );

    userIds.forEach((id) => {
      cacheManager.delete(`user_${id}_false`);
      cacheManager.delete(`user_${id}_true`);
    });

    return updates;
  });

  return result;
};

// Staff management functions
const getCompanyStaff = async (companyId, options = {}) => {
  const where = {
    companyId,
    status: { not: 'DELETED' },
    role: { in: ['STAFF', 'ADMIN'] },
  };

  const { search, role, status } = options;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) where.role = role;
  if (status) where.status = status;

  return await DatabaseUtils.findMany('user', {
    where,
    select: {
      id: true,
      name: true,
      email: true,
      roleId: true,
      role: {
        select: {
          id: true,
          name: true,
          displayName: true
        }
      },
      status: true,
      lastLogin: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

const reassignUserData = async (fromUserId, toUserId, companyId) => {
  return await DatabaseUtils.transaction(async (tx) => {
    // Reassign parties
    await tx.partyList.updateMany({
      where: { createdBy: fromUserId, companyId },
      data: { createdBy: toUserId },
    });

    // Reassign products
    await tx.product.updateMany({
      where: { createdBy: fromUserId, companyId },
      data: { createdBy: toUserId },
    });

    // Reassign PI invoices
    await tx.piInvoice.updateMany({
      where: { createdBy: fromUserId, companyId },
      data: { createdBy: toUserId },
    });

    // Reassign orders
    await tx.order.updateMany({
      where: { createdBy: fromUserId, companyId },
      data: { createdBy: toUserId },
    });

    // Reassign VGM documents
    await tx.vgmDocument.updateMany({
      where: { createdBy: fromUserId, companyId },
      data: { createdBy: toUserId },
    });

    // Reassign item categories
    await tx.itemCategory.updateMany({
      where: { createdBy: fromUserId, companyId },
      data: { createdBy: toUserId },
    });

    return { success: true };
  });
};

const deleteStaffAndReassign = async (staffId, reassignToUserId, companyId) => {
  // First reassign all data
  await reassignUserData(staffId, reassignToUserId, companyId);

  // Then delete the user
  await DatabaseUtils.update('user', { id: staffId }, { status: 'DELETED' });

  cacheManager.delete(`user_${staffId}_false`);
  cacheManager.delete(`user_${staffId}_true`);

  return { message: 'Staff deleted and data reassigned successfully' };
};

const getUserDataSummary = async (userId, companyId) => {
  const [parties, products, piInvoices, orders, vgmDocuments] =
    await Promise.all([
      DatabaseUtils.count('partyList', { createdBy: userId, companyId }),
      DatabaseUtils.count('product', { createdBy: userId, companyId }),
      DatabaseUtils.count('piInvoice', { createdBy: userId, companyId }),
      DatabaseUtils.count('order', { createdBy: userId, companyId }),
      DatabaseUtils.count('vgmDocument', { createdBy: userId, companyId }),
    ]);

  return {
    parties,
    products,
    piInvoices,
    orders,
    vgmDocuments,
    total: parties + products + piInvoices + orders + vgmDocuments,
  };
};

const getCompanyDashboardStats = async (companyId) => {
  const [parties, products, piInvoices, orders, vgmDocuments] =
    await Promise.all([
      prisma.partyList.count({ where: { companyId } }),
      prisma.product.count({ where: { companyId } }),
      prisma.piInvoice.count({ where: { companyId } }),
      prisma.order.count({ where: { companyId } }),
      prisma.vgmDocument.count({ where: { companyId } }),
    ]);

  const stats = {
    parties,
    products,
    piInvoices,
    orders,
    vgmDocuments,
  };

  return stats;
};

const clearCompanyDashboardCache = (companyId) => {
  const cacheKey = `company_dashboard_stats_${companyId}`;
  cacheManager.delete(cacheKey);
};

// Super Admin functions
const getAllUsersForSuperAdmin = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    status = '',
    isBlocked = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const where = {
    status: { not: 'DELETED' },
    role: { not: 'SUPER_ADMIN' },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) where.role = role;
  if (status) where.status = status;
  if (isBlocked !== '') where.isBlocked = isBlocked === 'true';

  const orderBy = { [sortBy]: sortOrder };

  const select = {
    id: true,
    name: true,
    email: true,
    mobileNum: true,
    roleId: true,
    role: {
      select: {
        id: true,
        name: true,
        displayName: true
      }
    },
    status: true,
    isBlocked: true,
    lastLogin: true,
    createdAt: true,
    companyId: true,
    company: {
      select: {
        name: true,
      },
    },
  };

  return await DatabaseUtils.findMany('user', {
    where,
    select,
    orderBy,
    page: Number(page),
    limit: Number(limit),
  });
};

const toggleUserBlock = async (userId) => {
  const user = await getUserById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  if (user.role === 'SUPER_ADMIN') {
    throw new ApiError(403, 'Cannot block/unblock super admin');
  }

  const updatedUser = await DatabaseUtils.update(
    'user',
    { id: Number(userId) },
    { isBlocked: !user.isBlocked }
  );

  cacheManager.delete(`user_${userId}_false`);
  cacheManager.delete(`user_${userId}_true`);

  return {
    user: updatedUser,
    message: `User ${updatedUser.isBlocked ? 'blocked' : 'unblocked'} successfully`,
  };
};

const getSuperAdminDashboardStats = async () => {
  const cacheKey = 'super_admin_dashboard_stats';
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  const [
    parties,
    products,
    piInvoices,
    orders,
    vgmDocuments,
    companies,
    users,
    categories,
  ] = await Promise.all([
    prisma.partyList.count(),
    prisma.product.count(),
    prisma.piInvoice.count(),
    prisma.order.count(),
    prisma.vgmDocument.count(),
    prisma.companyDetails.count(),
    prisma.user.count({ where: { status: { not: 'DELETED' } } }),
    prisma.itemCategory.count(),
  ]);

  const stats = {
    parties,
    products,
    piInvoices,
    orders,
    vgmDocuments,
    companies,
    users,
    categories,
  };

  cacheManager.set(cacheKey, stats, 5 * 60 * 1000); // Cache for 5 minutes
  return stats;
};

// Enhanced Super Admin functions for complete database access
const getAllDatabaseData = async (options = {}) => {
  const { table = '', limit = 100, page = 1 } = options;

  const allData = {};

  try {
    // Get all main tables data
    const [
      users,
      companies,
      parties,
      products,
      piInvoices,
      orders,
      vgmDocuments,
      categories,
      packagingUnits,
    ] = await Promise.all([
      prisma.user.findMany({
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        select: {
          id: true,
          name: true,
          email: true,
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
              displayName: true
            }
          },
          status: true,
          isBlocked: true,
          lastLogin: true,
          createdAt: true,
          companyId: true,
          company: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.companyDetails.findMany({
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        include: {
          _count: {
            select: {
              users: true,
              parties: true,
              products: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.partyList.findMany({
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        include: {
          company: { select: { name: true } },
          creator: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findMany({
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        include: {
          company: { select: { name: true } },
          user: { select: { name: true, email: true } },
          category: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.piInvoice.findMany({
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        include: {
          company: { select: { name: true } },
          creator: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.findMany({
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        include: {
          company: { select: { name: true } },
          creator: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vgmDocument.findMany({
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        include: {
          company: { select: { name: true } },
          creator: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.itemCategory.findMany({
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        include: {
          CompanyDetails: { select: { name: true } },
          User: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.packagingUnit.findMany({
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    allData.users = users;
    allData.companies = companies;
    allData.parties = parties;
    allData.products = products;
    allData.piInvoices = piInvoices;
    allData.orders = orders;
    allData.vgmDocuments = vgmDocuments;
    allData.categories = categories;
    allData.packagingUnits = packagingUnits;

    // Get counts for pagination
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.companyDetails.count(),
      prisma.partyList.count(),
      prisma.product.count(),
      prisma.piInvoice.count(),
      prisma.order.count(),
      prisma.vgmDocument.count(),
      prisma.itemCategory.count(),
      prisma.packagingUnit.count(),
    ]);

    allData.counts = {
      users: counts[0],
      companies: counts[1],
      parties: counts[2],
      products: counts[3],
      piInvoices: counts[4],
      orders: counts[5],
      vgmDocuments: counts[6],
      categories: counts[7],
      packagingUnits: counts[8],
    };

    return allData;
  } catch (error) {
    throw new ApiError(500, `Error fetching database data: ${error.message}`);
  }
};

const resetUserPassword = async (userId, newPassword) => {
  const user = await getUserById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  if (user.role === 'SUPER_ADMIN') {
    throw new ApiError(403, 'Cannot reset super admin password');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  await DatabaseUtils.update(
    'user',
    { id: Number(userId) },
    { password: hashedNewPassword }
  );

  cacheManager.delete(`user_${userId}_false`);
  cacheManager.delete(`user_${userId}_true`);

  return { message: 'Password reset successfully' };
};

const getAllCompanies = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy = { [sortBy]: sortOrder };

  return await DatabaseUtils.findMany('companyDetails', {
    where,
    include: {
      _count: {
        select: {
          users: true,
          parties: true,
          products: true,
          piInvoices: true,
          orders: true,
        },
      },
    },
    orderBy,
    page: Number(page),
    limit: Number(limit),
  });
};

const getCompanyDetails = async (companyId) => {
  const company = await prisma.companyDetails.findUnique({
    where: { id: Number(companyId) },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
              displayName: true
            }
          },
          status: true,
          lastLogin: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          users: true,
          parties: true,
          products: true,
          piInvoices: true,
          orders: true,
          vgmDocuments: true,
        },
      },
    },
  });

  if (!company) throw new ApiError(404, 'Company not found');
  return company;
};

const getAllTables = async () => {
  // Return available tables for Super Admin
  return {
    tables: [
      { name: 'users', description: 'All system users' },
      { name: 'companies', description: 'All companies' },
      { name: 'parties', description: 'Party lists' },
      { name: 'products', description: 'All products' },
      { name: 'piInvoices', description: 'PI Invoices' },
      { name: 'orders', description: 'All orders' },
      { name: 'vgmDocuments', description: 'VGM Documents' },
      { name: 'categories', description: 'Item categories' },
      { name: 'packagingUnits', description: 'Packaging units' },
    ],
  };
};

const getTableData = async (tableName, options = {}) => {
  const { page = 1, limit = 50, search = '' } = options;

  let data = [];
  let count = 0;

  try {
    switch (tableName) {
      case 'users':
        const userWhere = search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {};

        [data, count] = await Promise.all([
          prisma.user.findMany({
            where: userWhere,
            include: { 
              company: { select: { name: true } },
              role: {
                select: {
                  id: true,
                  name: true,
                  displayName: true
                }
              }
            },
            take: Number(limit),
            skip: (Number(page) - 1) * Number(limit),
            orderBy: { createdAt: 'desc' },
          }),
          prisma.user.count({ where: userWhere }),
        ]);
        break;

      case 'companies':
        const companyWhere = search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {};

        [data, count] = await Promise.all([
          prisma.companyDetails.findMany({
            where: companyWhere,
            include: {
              _count: { select: { users: true, products: true } },
            },
            take: Number(limit),
            skip: (Number(page) - 1) * Number(limit),
            orderBy: { createdAt: 'desc' },
          }),
          prisma.companyDetails.count({ where: companyWhere }),
        ]);
        break;

      default:
        throw new ApiError(400, 'Invalid table name');
    }

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil(count / Number(limit)),
      },
    };
  } catch (error) {
    throw new ApiError(
      500,
      `Error fetching ${tableName} data: ${error.message}`
    );
  }
};

export const UserService = {
  getUserById,
  getUserByEmail,
  getAllUsers,
  createUser,
  updateUser,
  changePassword,
  deleteUser,
  updateLastLogin,
  getUserStats,
  bulkUpdateStatus,
  getCompanyStaff,
  reassignUserData,
  deleteStaffAndReassign,
  getUserDataSummary,
  getCompanyDashboardStats,
  clearCompanyDashboardCache,
  getAllUsersForSuperAdmin,
  toggleUserBlock,
  getSuperAdminDashboardStats,
  getAllDatabaseData,
  resetUserPassword,
  getAllCompanies,
  getCompanyDetails,
  getAllTables,
  getTableData,
};
