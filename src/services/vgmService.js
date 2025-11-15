import { prisma } from '../config/dbConfig.js';

export class VgmService {
  static async createVgmDocument(data) {
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
  }

  static async getVgmDocuments(where, page, limit) {
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
                companyName: true
              }
            }
          } 
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
  }

  static async getVgmDocument(id, companyId) {
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
  }

  static async updateVgmDocument(id, companyId, data) {
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
  }

  static async deleteVgmDocument(id, companyId) {
    return await prisma.vgmDocument.delete({
      where: { id: parseInt(id), companyId },
    });
  }

  static async getFirstPackagingStep(piInvoiceId) {
    return await prisma.packingList.findFirst({
      where: { piInvoiceId },
      orderBy: { stepNumber: 'asc' },
    });
  }
}