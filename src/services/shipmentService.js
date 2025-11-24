import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
const prisma = new PrismaClient();

class ShipmentService {
  // Generate unique shipment number
  async generateShipmentNumber(companyId) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const prefix = `SH${year}${month}${day}`;

    // Find the last shipment number for today
    const lastShipment = await prisma.shipment.findFirst({
      where: {
        companyId,
        shipmentNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        shipmentNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastShipment) {
      const lastSequence = parseInt(lastShipment.shipmentNumber.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(3, '0')}`;
  }

  // Create shipment
  async createShipment(shipmentData, userId, companyId) {
    try {
      // Check if order exists and belongs to company
      const order = await prisma.order.findFirst({
        where: {
          id: shipmentData.orderId,
          companyId,
        },
      });

      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Check if shipment already exists for this order
      const existingShipment = await prisma.shipment.findUnique({
        where: {
          orderId: shipmentData.orderId,
        },
      });

      if (existingShipment) {
        throw new ApiError(400, 'Shipment already exists for this order');
      }

      // Generate shipment number
      const shipmentNumber = await this.generateShipmentNumber(companyId);

      // Create shipment
      const shipment = await prisma.shipment.create({
        data: {
          ...shipmentData,
          shipmentNumber,
          companyId,
          createdBy: userId,
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              piNumber: true,
            },
          },
        },
      });

      return shipment;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to create shipment: ${error.message}`);
    }
  }

  // Get shipment by ID
  async getShipmentById(shipmentId, companyId) {
    try {
      const shipment = await prisma.shipment.findFirst({
        where: {
          id: shipmentId,
          companyId,
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              piNumber: true,
              totalAmount: true,
              orderStatus: true,
              paymentStatus: true,
            },
          },
          creator: {
            select: {
              name: true,
              email: true,
            },
          },
          updater: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!shipment) {
        throw new ApiError(404, 'Shipment not found');
      }

      return shipment;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to fetch shipment: ${error.message}`);
    }
  }

  // Get shipment by order ID
  async getShipmentByOrderId(orderId, companyId) {
    try {
      const shipment = await prisma.shipment.findFirst({
        where: {
          orderId,
          companyId,
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              piNumber: true,
              totalAmount: true,
              orderStatus: true,
              paymentStatus: true,
            },
          },
        },
      });

      return shipment;
    } catch (error) {
      throw new ApiError(500, `Failed to fetch shipment: ${error.message}`);
    }
  }

  // Update shipment
  async updateShipment(shipmentId, updateData, userId, companyId) {
    try {
      // Check if shipment exists and belongs to company
      const existingShipment = await prisma.shipment.findFirst({
        where: {
          id: shipmentId,
          companyId,
        },
      });

      if (!existingShipment) {
        throw new ApiError(404, 'Shipment not found');
      }

      // Update shipment
      const shipment = await prisma.shipment.update({
        where: {
          id: shipmentId,
        },
        data: {
          ...updateData,
          updatedBy: userId,
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              piNumber: true,
            },
          },
        },
      });

      return shipment;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to update shipment: ${error.message}`);
    }
  }

  // Get all shipments for company
  async getShipments(companyId, page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        ...filters,
      };

      const [shipments, total] = await Promise.all([
        prisma.shipment.findMany({
          where,
          include: {
            order: {
              select: {
                orderNumber: true,
                piNumber: true,
                totalAmount: true,
                orderStatus: true,
                paymentStatus: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        prisma.shipment.count({ where }),
      ]);

      return {
        shipments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new ApiError(500, `Failed to fetch shipments: ${error.message}`);
    }
  }

  // Delete shipment
  async deleteShipment(shipmentId, companyId) {
    try {
      // Check if shipment exists and belongs to company
      const existingShipment = await prisma.shipment.findFirst({
        where: {
          id: shipmentId,
          companyId,
        },
      });

      if (!existingShipment) {
        throw new ApiError(404, 'Shipment not found');
      }

      await prisma.shipment.delete({
        where: {
          id: shipmentId,
        },
      });

      return { message: 'Shipment deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, `Failed to delete shipment: ${error.message}`);
    }
  }
}

export default new ShipmentService();
