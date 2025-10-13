import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';

const assignDataToStaff = async (
  entityType,
  entityIds,
  fromUserId,
  toUserId,
  companyId
) => {
  // Validate users belong to same company
  const [fromUser, toUser] = await Promise.all([
    prisma.user.findFirst({ where: { id: fromUserId, companyId } }),
    prisma.user.findFirst({ where: { id: toUserId, companyId } }),
  ]);

  if (!fromUser || !toUser) {
    throw new ApiError(404, 'User not found in company');
  }

  const entityMap = {
    party: 'partyList',
    product: 'product',
    piInvoice: 'piInvoice',
    order: 'order',
    vgmDocument: 'vgmDocument',
  };

  const tableName = entityMap[entityType];
  if (!tableName) {
    throw new ApiError(400, 'Invalid entity type');
  }

  return await prisma.$transaction(async (tx) => {
    // Update ownership
    const result = await tx[tableName].updateMany({
      where: {
        id: { in: entityIds },
        companyId,
        createdBy: fromUserId,
      },
      data: { createdBy: toUserId },
    });

    return {
      assigned: result.count,
      entityType,
      fromUser: fromUser.name,
      toUser: toUser.name,
    };
  });
};

const getAssignableData = async (userId, companyId, entityType) => {
  const entityMap = {
    party: 'partyList',
    product: 'product',
    piInvoice: 'piInvoice',
    order: 'order',
    vgmDocument: 'vgmDocument',
  };

  const tableName = entityMap[entityType];
  if (!tableName) {
    throw new ApiError(400, 'Invalid entity type');
  }

  const selectFields = {
    partyList: {
      id: true,
      companyName: true,
      contactPerson: true,
      createdAt: true,
    },
    product: { id: true, name: true, sku: true, createdAt: true },
    piInvoice: {
      id: true,
      piNumber: true,
      partyName: true,
      totalAmount: true,
      createdAt: true,
    },
    order: {
      id: true,
      orderNumber: true,
      piNumber: true,
      totalAmount: true,
      createdAt: true,
    },
    vgmDocument: { id: true, verifiedGrossMass: true, createdAt: true },
  };

  return await prisma[tableName].findMany({
    where: {
      companyId,
      createdBy: userId,
    },
    select: selectFields[tableName],
    orderBy: { createdAt: 'desc' },
  });
};

export const DataAssignmentService = {
  assignDataToStaff,
  getAssignableData,
};
