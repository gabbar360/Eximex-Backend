import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const createPayment = async (data, userId) => {
  return await prisma.payment.create({
    data: {
      ...data,
      createdBy: userId,
    },
    include: {
      piInvoice: true,
      party: true,
    },
  });
};

const getPayments = async (companyId, query = {}) => {
  const { status, startDate, endDate } = query;
  
  const where = { companyId };
  if (status) where.status = status;
  if (startDate && endDate) {
    where.dueDate = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  return await prisma.payment.findMany({
    where,
    include: {
      piInvoice: {
        select: { piNumber: true, partyName: true, totalAmount: true, advanceAmount: true }
      },
      party: {
        select: { companyName: true }
      },
    },
    orderBy: { dueDate: 'asc' },
  });
};

const updatePaymentStatus = async (id, status) => {
  return await prisma.payment.update({
    where: { id: parseInt(id) },
    data: { status },
  });
};

const getDuePayments = async (companyId) => {
  return await prisma.payment.findMany({
    where: {
      companyId,
      status: { in: ['pending', 'overdue'] },
      dueDate: { lte: new Date() },
    },
    include: {
      piInvoice: {
        select: { piNumber: true, partyName: true, totalAmount: true, advanceAmount: true }
      },
      party: {
        select: { companyName: true }
      },
    },
    orderBy: { dueDate: 'asc' },
  });
};

export default {
  createPayment,
  getPayments,
  updatePaymentStatus,
  getDuePayments,
};