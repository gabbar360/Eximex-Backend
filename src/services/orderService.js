import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import puppeteer from 'puppeteer';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { UserService } from './userService.js';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class OrderService {
  static async createOrder(orderData, userId) {
    const { piInvoiceId, companyId, ...data } = orderData;

    // Verify PI Invoice exists
    const piInvoice = await prisma.piInvoice.findFirst({
      where: {
        id: piInvoiceId,
        companyId,
      },
      include: {
        products: true,
      },
    });

    if (!piInvoice) {
      throw new ApiError(404, 'PI Invoice not found');
    }

    // Check if order already exists for this PI
    const existingOrder = await prisma.order.findFirst({
      where: { piInvoiceId },
    });

    if (existingOrder) {
      throw new ApiError(400, 'Order already exists for this PI Invoice');
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Calculate total product quantity
    const productQty = piInvoice.products.reduce(
      (sum, product) => sum + product.quantity,
      0
    );

    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          companyId,
          piInvoiceId,
          orderNumber,
          piNumber: piInvoice.piNumber,
          totalAmount: piInvoice.totalAmount,
          paymentAmount:
            data.paymentAmount && data.paymentAmount !== ''
              ? parseFloat(data.paymentAmount)
              : null,
          productQty,
          deliveryTerms: data.deliveryTerms || piInvoice.deliveryTerm,
          bookingNumber:
            data.bookingNumber && data.bookingNumber !== ''
              ? data.bookingNumber
              : null,
          bookingDate:
            data.bookingDate && data.bookingDate !== ''
              ? new Date(data.bookingDate)
              : null,
          wayBillNumber:
            data.wayBillNumber && data.wayBillNumber !== ''
              ? data.wayBillNumber
              : null,
          truckNumber:
            data.truckNumber && data.truckNumber !== ''
              ? data.truckNumber
              : null,
          orderStatus: 'confirmed',
          createdBy: userId,
        },
        include: {
          piInvoice: {
            include: {
              products: true,
              party: true,
            },
          },
          company: true,
        },
      });

      // Update PI status to confirmed
      await tx.piInvoice.update({
        where: { id: piInvoiceId },
        data: { status: 'confirmed' },
      });

      // Create payment entry if it doesn't exist
      const existingPayment = await tx.payment.findFirst({
        where: { piInvoiceId },
      });

      if (!existingPayment) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        const originalAmount =
          piInvoice.totalAmount + (piInvoice.advanceAmount || 0);

        await tx.payment.create({
          data: {
            companyId,
            piInvoiceId,
            partyId: piInvoice.partyId,
            amount: originalAmount,
            dueAmount: piInvoice.totalAmount,
            dueDate,
            status: 'pending',
            createdBy: userId,
          },
        });
      }

      return newOrder;
    });

    // Clear dashboard cache so admin sees updated counts
    UserService.clearCompanyDashboardCache(companyId);

    return order;
  }

  static async createOrderFromPi(piInvoiceId, userId, companyId) {
    // Verify PI Invoice exists
    const piInvoice = await prisma.piInvoice.findFirst({
      where: {
        id: piInvoiceId,
        companyId,
      },
      include: {
        products: true,
        party: true,
      },
    });

    if (!piInvoice) {
      throw new ApiError(404, 'PI Invoice not found');
    }

    // Check if order already exists for this PI
    const existingOrder = await prisma.order.findFirst({
      where: { piInvoiceId },
    });

    if (existingOrder) {
      throw new ApiError(400, 'Order already exists for this PI Invoice');
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Calculate total product quantity
    const productQty = piInvoice.products.reduce(
      (sum, product) => sum + product.quantity,
      0
    );

    const order = await prisma.order.create({
      data: {
        companyId,
        piInvoiceId,
        orderNumber,
        piNumber: piInvoice.piNumber,
        totalAmount: piInvoice.totalAmount,
        paymentAmount: null, // Will be updated when payment is made
        productQty,
        deliveryTerms: piInvoice.deliveryTerm,
        bookingNumber: null, // Will be updated later when booking details are available
        bookingDate: null, // Will be updated later when booking details are available
        wayBillNumber: null, // Will be updated later when shipping details are available
        truckNumber: null, // Will be updated later when shipping details are available
        orderStatus: 'confirmed', // Set to confirmed since PI is already confirmed
        createdBy: userId,
      },
      include: {
        piInvoice: {
          include: {
            products: true,
            party: true,
          },
        },
        company: true,
      },
    });

    return order;
  }

  static async getOrders(companyId, queryParams = {}, dataFilters = {}) {
    const { page = 1, limit = 10, status, search } = queryParams;
    const skip = (page - 1) * limit;

    const where = {
      companyId,
      ...dataFilters,
      ...(status && { orderStatus: status }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { piNumber: { contains: search, mode: 'insensitive' } },
          { bookingNumber: { contains: search, mode: 'insensitive' } },
          { wayBillNumber: { contains: search, mode: 'insensitive' } },
          { truckNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          piInvoice: {
            include: {
              party: true,
              packagingSteps: true,
              vgmDocuments: {
                select: {
                  id: true,
                  verifiedGrossMass: true,
                  method: true,
                  status: true,
                  verifiedBy: true,
                  verificationDate: true,
                  productPackagingStep: {
                    select: {
                      containerNumber: true,
                      sealNumber: true,
                      sealType: true,
                    },
                  },
                },
              },
            },
          },
          packagingSteps: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getOrderById(orderId, companyId) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        companyId,
      },
      include: {
        piInvoice: {
          include: {
            products: {
              include: {
                category: {
                  select: { id: true, name: true, hsnCode: true },
                },
                subcategory: {
                  select: { id: true, name: true, hsnCode: true },
                },
              },
            },
            party: true,
            packagingSteps: true,
            vgmDocuments: {
              select: {
                id: true,
                verifiedGrossMass: true,
                method: true,
                status: true,
                verifiedBy: true,
                verificationDate: true,
                productPackagingStep: {
                  select: {
                    containerNumber: true,
                    sealNumber: true,
                    sealType: true,
                  },
                },
              },
            },
          },
        },
        company: true,
        packagingSteps: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        updater: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    return order;
  }

  static async updateOrder(orderId, updateData, userId, companyId) {
    const existingOrder = await prisma.order.findFirst({
      where: { id: orderId, companyId },
    });

    if (!existingOrder) {
      throw new ApiError(404, 'Order not found');
    }

    const processedData = {
      ...updateData,
      ...(updateData.bookingDate && {
        bookingDate: new Date(updateData.bookingDate),
      }),
      updatedBy: userId,
    };

    const order = await prisma.order.update({
      where: { id: orderId },
      data: processedData,
      include: {
        piInvoice: {
          include: {
            products: true,
            party: true,
          },
        },
        company: true,
      },
    });

    return order;
  }

  static async updateOrderStatus(orderId, status, userId, companyId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, companyId },
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: status,
        updatedBy: userId,
      },
      include: {
        piInvoice: {
          include: {
            party: true,
          },
        },
      },
    });

    return updatedOrder;
  }

  static async updatePaymentStatus(orderId, paymentStatus, userId, companyId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, companyId },
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus,
        updatedBy: userId,
      },
      include: {
        piInvoice: {
          include: {
            party: true,
          },
        },
      },
    });

    return updatedOrder;
  }

  static async deleteOrder(orderId, companyId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, companyId },
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    await prisma.order.delete({
      where: { id: orderId },
    });

    return { message: 'Order deleted successfully' };
  }

  static async generateOrderNumber() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const dateStr = `${year}${month}${day}`;

    // Find the last order number for today
    const lastOrder = await prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${dateStr}`,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    return `ORD-${dateStr}-${String(sequence).padStart(4, '0')}`;
  }

  static async generateOrderInvoicePdf(orderId, companyId, logoBase64 = null) {
    const order = await this.getOrderById(orderId, companyId);

    const templatePath = join(__dirname, '../views/invoice-template.ejs');
    const htmlContent = await ejs.renderFile(templatePath, {
      order,
      logoBase64,
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 800 });

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm',
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      scale: 0.8,
    });

    await browser.close();

    return pdfBuffer;
  }
}
