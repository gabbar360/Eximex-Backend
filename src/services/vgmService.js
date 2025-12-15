import { prisma } from '../config/dbConfig.js';

const createVgmDocument = async (data) => {
  return await prisma.vgmDocument.create({
    data,
    include: {
      piInvoice: { select: { piNumber: true } },
      packingList: {
        select: {
          containerNumber: true,
          sealNumber: true,
          sealType: true,
        },
      },
      creator: { select: { name: true } },
    },
  });
};

const getVgmDocuments = async (where, page, limit) => {
  const vgmDocuments = await prisma.vgmDocument.findMany({
    where,
    include: {
      piInvoice: {
        select: {
          piNumber: true,
          partyName: true,
          orderNumber: true,
          party: {
            select: {
              companyName: true,
            },
          },
        },
      },
      packingList: {
        select: {
          containerNumber: true,
          sealNumber: true,
          sealType: true,
        },
      },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: parseInt(limit),
  });

  const total = await prisma.vgmDocument.count({ where });
  return { vgmDocuments, total };
};

const getVgmDocument = async (id, companyId) => {
  return await prisma.vgmDocument.findFirst({
    where: { id: parseInt(id), companyId },
    include: {
      piInvoice: {
        select: {
          piNumber: true,
          partyName: true,
          containerType: true,
          numberOfContainers: true,
        },
      },
      packingList: {
        select: {
          containerNumber: true,
          sealNumber: true,
          sealType: true,
          description: true,
        },
      },
      creator: { select: { name: true } },
      updater: { select: { name: true } },
    },
  });
};

const updateVgmDocument = async (id, companyId, data) => {
  return await prisma.vgmDocument.update({
    where: { id: parseInt(id), companyId },
    data,
    include: {
      piInvoice: { select: { piNumber: true } },
      packingList: {
        select: {
          containerNumber: true,
          sealNumber: true,
          sealType: true,
        },
      },
      creator: { select: { name: true } },
    },
  });
};

const deleteVgmDocument = async (id, companyId) => {
  return await prisma.vgmDocument.delete({
    where: { id: parseInt(id), companyId },
  });
};

const getFirstPackagingStep = async (piInvoiceId) => {
  return await prisma.packingList.findFirst({
    where: { piInvoiceId },
    orderBy: { stepNumber: 'asc' },
  });
};

export const VgmService = {
  createVgmDocument,
  getVgmDocuments,
  getVgmDocument,
  updateVgmDocument,
  deleteVgmDocument,
  getFirstPackagingStep,
};