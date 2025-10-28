// perfect
import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PiInvoiceHistoryService } from './piInvoiceHistoryService.js';
import { generatePDF } from '../utils/puppeteerConfig.js';
import { UserService } from './userService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generatePiNumber = async () => {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const dateStr = `${y}${m}${d}`;
  const currentDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const counter = await prisma.$transaction(async (tx) => {
    const existing = await tx.piDailyCounter.findUnique({
      where: { date: currentDate },
    });

    if (existing) {
      const updated = await tx.piDailyCounter.update({
        where: { date: currentDate },
        data: { lastIncrementalNumber: existing.lastIncrementalNumber + 1 },
      });
      return updated.lastIncrementalNumber;
    } else {
      const created = await tx.piDailyCounter.create({
        data: { date: currentDate, lastIncrementalNumber: 1 },
      });
      return created.lastIncrementalNumber;
    }
  });

  const incremental = counter.toString().padStart(3, '0');
  return `PI${dateStr}-${incremental}`;
};

// Enhanced packing breakdown calculation
const calculatePackingBreakdown = (product, quantity, unit) => {
  if (!product.packingHierarchy) {
    return null;
  }

  const hierarchy = product.packingHierarchy;
  let boxes = 0;
  let pallets = 0;
  let totalWeight = 0;
  let totalCBM = 0;

  // Calculate based on input unit
  switch (unit) {
    case 'pcs':
      boxes = Math.ceil(quantity / hierarchy.conversionRates.piecesPerBox);
      totalWeight = quantity * hierarchy.weights.weightPerPiece;
      break;
    case 'kg':
      const pieces = quantity / hierarchy.weights.weightPerPiece;
      boxes = Math.ceil(pieces / hierarchy.conversionRates.piecesPerBox);
      totalWeight = quantity;
      break;
    case 'box':
      boxes = quantity;
      totalWeight = quantity * hierarchy.weights.weightPerBox;
      break;
    case 'pallet':
      pallets = quantity;
      boxes = quantity * hierarchy.conversionRates.boxesPerPallet;
      totalWeight = quantity * hierarchy.weights.weightPerPallet;
      break;
    case 'sqm':
    case 'm²':
      boxes = Math.ceil(quantity / hierarchy.conversionRates.piecesPerBox);
      totalWeight = quantity * hierarchy.weights.weightPerPiece;
      break;
    default:
      boxes = Math.ceil(
        quantity / (hierarchy.conversionRates.piecesPerBox || 1)
      );
      totalWeight = boxes * (hierarchy.weights.weightPerBox || 0);
  }

  // Calculate pallets if not already calculated
  if (pallets === 0) {
    pallets = Math.ceil(boxes / hierarchy.conversionRates.boxesPerPallet);
  }

  // Calculate CBM
  totalCBM = boxes * hierarchy.volumes.cbmPerBox;

  return {
    calculatedBoxes: boxes,
    calculatedPallets: pallets,
    totalWeight,
    totalCBM,
  };
};

const calculateTotals = (products, charges = {}, containerType = null) => {
  const subtotal = products.reduce((sum, product) => sum + product.total, 0);
  const totalWeight = products.reduce(
    (sum, product) => sum + (product.totalWeight || 0),
    0
  );
  const totalGrossWeight = products.reduce((sum, product) => {
    if (!product.productId) return sum;
    
    let boxes = 0;
    
    // Calculate boxes based on unit - same as frontend
    if (product.unit === 'Box' || product.unit === 'box') {
      boxes = product.quantity;
    } else if (product.unit === 'pcs') {
      boxes = product.quantity / 2000; // 50 pcs/pack × 40 pack/box
    } else if (product.unit === 'package') {
      boxes = product.quantity / 40; // 40 packages per box
    } else {
      boxes = product.quantity; // fallback assume it's boxes
    }
    
    // Get gross weight per box from product data - same as frontend
    let grossWeightPerBox = product.product?.packagingHierarchyData?.dynamicFields?.grossWeightPerBox || 
                           product.product?.grossWeightPerBox || 10.06;
    
    // Convert to KG if in grams - same as frontend
    if (grossWeightPerBox > 100) {
      grossWeightPerBox = grossWeightPerBox / 1000;
    }
    
    return sum + (boxes * grossWeightPerBox);
  }, 0);
  const chargesTotal = Object.values(charges).reduce(
    (sum, charge) => sum + (parseFloat(charge) || 0),
    0
  );
  const totalAmount = subtotal + chargesTotal;

  // Enhanced volume calculation
  let totalVolume = 0;
  let totalBoxes = 0;
  let totalPallets = 0;

  products.forEach((product) => {
    if (product.packingBreakdown) {
      totalVolume += product.packingBreakdown.totalCBM || 0;
      totalBoxes += product.packingBreakdown.calculatedBoxes || 0;
      totalPallets += product.packingBreakdown.calculatedPallets || 0;
    }
  });

  // Enhanced container calculation based on container type
  let requiredContainers = 1;
  if (containerType && containerType !== 'LCL') {
    const containerConfigs = {
      '20 Feet': { maxWeight: 21000, maxVolume: 28 },
      '40 Feet': { maxWeight: 26500, maxVolume: 56 },
      '40 Feet HQ': { maxWeight: 26500, maxVolume: 68 },
      '45 Feet HQ': { maxWeight: 27500, maxVolume: 76 },
      'Reefer 20': { maxWeight: 21000, maxVolume: 25 },
      'Reefer 40': { maxWeight: 26500, maxVolume: 59 },
      LCL: { maxWeight: 0, maxVolume: 0 },
    };

    const config = containerConfigs[containerType];
    if (config && config.maxWeight > 0 && config.maxVolume > 0) {
      const containersByWeight =
        totalWeight > 0 ? Math.ceil(totalWeight / config.maxWeight) : 1;
      const containersByVolume =
        totalVolume > 0 ? Math.ceil(totalVolume / config.maxVolume) : 1;
      requiredContainers = Math.max(containersByWeight, containersByVolume, 1);
    }
  }

  return {
    subtotal,
    totalWeight,
    totalGrossWeight,
    totalVolume,
    totalBoxes,
    totalPallets,
    chargesTotal,
    totalAmount,
    requiredContainers,
  };
};

const createPiInvoice = async (data, userId, req = {}) => {
  const { products = [], companyId, partyId, ...piData } = data;

  if (!companyId) {
    throw new ApiError(400, 'Company ID is required');
  }

  const piNumber = await generatePiNumber();

  // Calculate product totals and enhanced packing breakdown
  const productsWithTotals = products.map((product) => {
    const total = (product.quantity || 0) * (product.rate || 0);

    // Calculate enhanced packing breakdown if available
    let packingBreakdown = null;
    if (product.packingHierarchy && product.quantity && product.unit) {
      packingBreakdown = calculatePackingBreakdown(
        product,
        product.quantity,
        product.unit
      );
    }

    return {
      ...product,
      total,
      packingBreakdown,
      calculatedBoxes: packingBreakdown?.calculatedBoxes || null,
      calculatedPallets: packingBreakdown?.calculatedPallets || null,
      totalCBM: packingBreakdown?.totalCBM || null,
      totalWeight:
        packingBreakdown?.totalWeight ||
        product.totalWeight ||
        product.quantity * 1 ||
        0,
    };
  });

  const totals = calculateTotals(
    productsWithTotals,
    piData.charges,
    piData.containerType
  );

  // Ensure numberOfContainers is never 0
  const numberOfContainers = Math.max(
    piData.numberOfContainers || totals.requiredContainers,
    1
  );

  try {
    const piInvoice = await prisma.$transaction(async (tx) => {
      const pi = await tx.piInvoice.create({
        data: {
          ...piData,
          piNumber,
          companyId,
          ...(partyId && { partyId }),
          ...totals,
          numberOfContainers,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      if (productsWithTotals.length > 0) {
        await tx.piProduct.createMany({
          data: productsWithTotals.map((product, index) => ({
            ...product,
            piInvoiceId: pi.id,
            companyId: companyId,
            lineNumber: index + 1,
          })),
        });
      }

      // For creation, statusBefore is null but we'll set it to 'New' for clarity
      const initialStatus = 'New';
      const finalStatus = piData.status || 'pending';

      // Create history record with enhanced details
      await tx.piInvoiceHistory.create({
        data: {
          piInvoiceId: pi.id,
          action: 'CREATE',
          changeData: { ...piData, products: productsWithTotals },
          description: `PI Invoice ${piNumber} was created`,
          ipAddress: req.ip || '127.0.0.1',
          deviceInfo: req.headers?.['user-agent'] || 'Unknown Device',
          statusBefore: initialStatus,
          statusAfter: finalStatus,
          changedFields: ['all'], // New invoice, all fields are new
          createdBy: userId,
        },
      });

      return tx.piInvoice.findUnique({
        where: { id: pi.id },
        include: {
          products: true,
          company: true,
          party: true,
        },
      });
    });

    // Clear dashboard cache so admin sees updated counts
    UserService.clearCompanyDashboardCache(companyId);

    return piInvoice;
  } catch (error) {
    console.error('Error creating PI invoice with history:', error);
    throw error;
  }
};

const getPiInvoices = async (companyId, filters = {}, dataFilters = {}) => {
  const { page = 1, limit = 10, status, search } = filters;
  const skip = (page - 1) * limit;

  const where = {
    ...dataFilters, // This includes companyId and createdBy for staff
    ...(status && { status }),
    ...(search && {
      OR: [
        { piNumber: { contains: search, mode: 'insensitive' } },
        { partyName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [piInvoices, total] = await Promise.all([
    prisma.piInvoice.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        party: { select: { id: true, companyName: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.piInvoice.count({ where }),
  ]);

  return {
    piInvoices,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getPiInvoiceById = async (id, companyId) => {
  const piInvoice = await prisma.piInvoice.findFirst({
    where: { id, companyId },
    include: {
      products: {
        include: {
          product: {
            include: {
              category: true,
              subCategory: true,
            },
          },
          category: true,
          subcategory: true,
        },
        orderBy: { lineNumber: 'asc' },
      },
      company: true,
      party: true,
      creator: { select: { id: true, name: true } },
      updater: { select: { id: true, name: true } },
    },
  });

  if (!piInvoice) {
    throw new ApiError(404, 'PI Invoice not found');
  }

  return piInvoice;
};

const updatePiInvoice = async (id, data, userId, companyId, req = {}) => {
  const existingPi = await prisma.piInvoice.findFirst({
    where: { id, companyId },
    include: { products: true },
  });

  if (!existingPi) {
    throw new ApiError(404, 'PI Invoice not found');
  }

  // Separate products and exclude companyId from update data
  const { products, companyId: _, ...piData } = data;

  try {
    const updatedPi = await prisma.$transaction(async (tx) => {
      let productsForCalculation = existingPi.products;

      // If products are provided, update them first
      if (products && products.length > 0) {
        // Delete existing products
        await tx.piProduct.deleteMany({
          where: { piInvoiceId: id },
        });

        // Create new products with enhanced totals and packing breakdown
        const productsWithTotals = products.map((product, index) => {
          const total = (product.quantity || 0) * (product.rate || 0);

          // Calculate enhanced packing breakdown if available
          let packingBreakdown = null;
          if (product.packingHierarchy && product.quantity && product.unit) {
            packingBreakdown = calculatePackingBreakdown(
              product,
              product.quantity,
              product.unit
            );
          }

          return {
            ...product,
            total,
            packingBreakdown,
            calculatedBoxes: packingBreakdown?.calculatedBoxes || null,
            calculatedPallets: packingBreakdown?.calculatedPallets || null,
            totalCBM: packingBreakdown?.totalCBM || null,
            totalWeight:
              packingBreakdown?.totalWeight ||
              product.totalWeight ||
              product.quantity * 1 ||
              0,
            piInvoiceId: id,
            companyId: companyId,
            lineNumber: index + 1,
          };
        });

        await tx.piProduct.createMany({
          data: productsWithTotals,
        });

        // Use new products for calculation
        productsForCalculation = productsWithTotals;
      }

      // Calculate totals with proper products and container type
      const containerType = piData.containerType || existingPi.containerType;
      const totals = calculateTotals(
        productsForCalculation,
        piData.charges || existingPi.charges || {},
        containerType
      );

      // Ensure numberOfContainers is never 0
      const numberOfContainers = Math.max(
        piData.numberOfContainers || totals.requiredContainers,
        1
      );

      // Determine which fields have changed
      const changedFields = [];
      Object.keys(piData).forEach((key) => {
        if (JSON.stringify(existingPi[key]) !== JSON.stringify(piData[key])) {
          changedFields.push(key);
        }
      });

      if (products && products.length !== existingPi.products.length) {
        changedFields.push('products');
      }

      // Get current status before update
      const currentStatus = existingPi.status || 'pending';

      // Get new status if it's being updated
      const newStatus = piData.status || currentStatus;

      // Update PI Invoice (without companyId and products)
      const pi = await tx.piInvoice.update({
        where: { id },
        data: {
          ...piData,
          ...totals,
          numberOfContainers,
          updatedBy: userId,
        },
      });

      // Create history record for update with enhanced details
      await tx.piInvoiceHistory.create({
        data: {
          piInvoiceId: id,
          action: 'UPDATE',
          changeData: {
            previous: {
              ...existingPi,
              products: existingPi.products,
            },
            updated: {
              ...piData,
              products: products || [],
              ...totals,
            },
          },
          description: `PI Invoice ${existingPi.piNumber} was updated`,
          ipAddress: req.ip || '127.0.0.1',
          deviceInfo: req.headers?.['user-agent'] || 'Unknown Device',
          statusBefore: currentStatus,
          statusAfter: newStatus,
          changedFields: changedFields.length > 0 ? changedFields : ['none'],
          createdBy: userId,
        },
      });

      // Return complete data
      return tx.piInvoice.findUnique({
        where: { id },
        include: {
          products: true,
          company: true,
          party: true,
        },
      });
    });

    return updatedPi;
  } catch (error) {
    console.error('Error updating PI invoice with history:', error);
    throw error;
  }
};

const deletePiInvoice = async (id, companyId, userId, req = {}) => {
  const piInvoice = await prisma.piInvoice.findFirst({
    where: { id, companyId },
    include: { products: true },
  });

  if (!piInvoice) {
    throw new ApiError(404, 'PI Invoice not found');
  }

  // Check if PI has related orders
  const relatedOrders = await prisma.order.findMany({
    where: { piInvoiceId: id },
  });

  if (relatedOrders.length > 0) {
    throw new ApiError(
      400,
      `Cannot delete PI Invoice. It has ${relatedOrders.length} related order(s). Please delete the orders first.`
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Get current status
      const currentStatus = piInvoice.status || 'Unknown';

      // Create history record before deletion with enhanced details
      await tx.piInvoiceHistory.create({
        data: {
          piInvoiceId: id,
          action: 'DELETE',
          changeData: piInvoice,
          description: `PI Invoice ${piInvoice.piNumber} was deleted`,
          ipAddress: req.ip || '127.0.0.1',
          deviceInfo: req.headers?.['user-agent'] || 'Unknown Device',
          statusBefore: currentStatus,
          statusAfter: 'Deleted',
          changedFields: ['all'],
          createdBy: userId,
        },
      });

      // Delete the invoice
      await tx.piInvoice.delete({
        where: { id },
      });
    });

    return { message: 'PI Invoice deleted successfully' };
  } catch (error) {
    console.error('Error deleting PI invoice with history:', error);
    throw error;
  }
};

const addPiProduct = async (piInvoiceId, productData, companyId) => {
  const piInvoice = await prisma.piInvoice.findFirst({
    where: { id: piInvoiceId, companyId },
    include: { products: true },
  });

  if (!piInvoice) {
    throw new ApiError(404, 'PI Invoice not found');
  }

  const maxLineNumber = Math.max(
    ...piInvoice.products.map((p) => p.lineNumber),
    0
  );

  const product = await prisma.$transaction(async (tx) => {
    const newProduct = await tx.piProduct.create({
      data: {
        ...productData,
        piInvoiceId,
        companyId,
        lineNumber: maxLineNumber + 1,
        total: productData.quantity * productData.rate,
      },
    });

    const allProducts = await tx.piProduct.findMany({
      where: { piInvoiceId },
    });

    const totals = calculateTotals(allProducts, piInvoice.charges);

    await tx.piInvoice.update({
      where: { id: piInvoiceId },
      data: totals,
    });

    return newProduct;
  });

  return product;
};

const updatePiProduct = async (
  piInvoiceId,
  productId,
  productData,
  companyId
) => {
  const piInvoice = await prisma.piInvoice.findFirst({
    where: { id: piInvoiceId, companyId },
  });

  if (!piInvoice) {
    throw new ApiError(404, 'PI Invoice not found');
  }

  const product = await prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.piProduct.update({
      where: { id: productId, piInvoiceId },
      data: {
        ...productData,
        total: productData.quantity * productData.rate,
      },
    });

    const allProducts = await tx.piProduct.findMany({
      where: { piInvoiceId },
    });

    const totals = calculateTotals(allProducts, piInvoice.charges);

    await tx.piInvoice.update({
      where: { id: piInvoiceId },
      data: totals,
    });

    return updatedProduct;
  });

  return product;
};

const deletePiProduct = async (piInvoiceId, productId, companyId) => {
  const piInvoice = await prisma.piInvoice.findFirst({
    where: { id: piInvoiceId, companyId },
  });

  if (!piInvoice) {
    throw new ApiError(404, 'PI Invoice not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.piProduct.delete({
      where: { id: productId, piInvoiceId },
    });

    const allProducts = await tx.piProduct.findMany({
      where: { piInvoiceId },
    });

    const totals = calculateTotals(allProducts, piInvoice.charges);

    await tx.piInvoice.update({
      where: { id: piInvoiceId },
      data: totals,
    });
  });

  return { message: 'Product removed successfully' };
};

const updatePiStatus = async (
  id,
  status,
  userId,
  companyId,
  req = {},
  paymentAmount = null
) => {
  const piInvoice = await prisma.piInvoice.findFirst({
    where: { id, companyId },
  });

  if (!piInvoice) {
    throw new ApiError(404, 'PI Invoice not found');
  }

  // If trying to confirm an already confirmed PI, return error
  if (piInvoice.status === 'confirmed' && status === 'confirmed') {
    console.log(
      `⚠️ Attempting to confirm already confirmed PI ${piInvoice.piNumber}`
    );
    throw new ApiError(400, `PI ${piInvoice.piNumber} is already confirmed`);
  }

  try {
    const updatedPi = await prisma.$transaction(async (tx) => {
      // Update the invoice status
      const updated = await tx.piInvoice.update({
        where: { id },
        data: { status, updatedBy: userId },
      });

      // Create history record for status update
      await tx.piInvoiceHistory.create({
        data: {
          piInvoiceId: id,
          action: 'UPDATE',
          changeData: {
            previous: { status: piInvoice.status },
            updated: { status },
          },
          description: `PI Invoice ${piInvoice.piNumber} status changed from ${piInvoice.status} to ${status}`,
          ipAddress: req.ip || '127.0.0.1',
          deviceInfo: req.headers?.['user-agent'] || 'Unknown Device',
          statusBefore: piInvoice.status,
          statusAfter: status,
          changedFields: ['status'],
          createdBy: userId,
        },
      });

      // AUTOMATIC PAYMENT CREATION
      if (status === 'confirmed') {
        // Check if payment already exists
        const existingPayment = await tx.payment.findFirst({
          where: { piInvoiceId: id },
        });

        if (!existingPayment) {
          // Create payment entry
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

          // Store original total amount before any advance deduction
          const originalAmount =
            piInvoice.totalAmount + (piInvoice.advanceAmount || 0);

          await tx.payment.create({
            data: {
              companyId,
              piInvoiceId: id,
              partyId: piInvoice.partyId,
              amount: originalAmount, // Original PI total
              dueAmount: piInvoice.totalAmount, // Remaining after advance
              dueDate,
              status: 'pending',
              createdBy: userId,
            },
          });
        }
      }

      // AUTOMATIC ORDER CREATION - FIXED LOGIC FOR MULTIPLE CONFIRMATIONS
      let createdOrder = null;

      // Check if order already exists first
      const existingOrder = await tx.order.findFirst({
        where: { piInvoiceId: id },
      });

      if (status === 'confirmed') {
        if (!existingOrder) {
          // Only create order if it doesn't exist and PI is being confirmed
          const piWithProducts = await tx.piInvoice.findFirst({
            where: { id },
            include: { products: true },
          });

          // Generate order number
          const today = new Date();
          const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

          const lastOrder = await tx.order.findFirst({
            where: { orderNumber: { startsWith: `ORD-${dateStr}` } },
            orderBy: { orderNumber: 'desc' },
          });

          let sequence = 1;
          if (lastOrder) {
            sequence = parseInt(lastOrder.orderNumber.split('-').pop()) + 1;
          }

          const orderNumber = `ORD-${dateStr}-${String(sequence).padStart(4, '0')}`;
          const productQty = piWithProducts.products.reduce(
            (sum, product) => sum + product.quantity,
            0
          );

          // CREATE THE ORDER
          createdOrder = await tx.order.create({
            data: {
              companyId,
              piInvoiceId: id,
              orderNumber,
              piNumber: piInvoice.piNumber,
              totalAmount: piInvoice.totalAmount,
              paymentAmount: paymentAmount,
              productQty,
              deliveryTerms: piInvoice.deliveryTerm || 'Standard',
              bookingNumber: null, // Will be updated later when booking details are available
              bookingDate: null, // Will be updated later when booking details are available
              wayBillNumber: null, // Will be updated later when shipping details are available
              truckNumber: null, // Will be updated later when shipping details are available
              orderStatus: 'confirmed',
              createdBy: userId,
            },
          });

          console.log(
            `✅ Order ${orderNumber} created automatically for PI ${piInvoice.piNumber}`
          );
        } else {
          // Order exists, just update payment amount if provided
          if (paymentAmount !== null) {
            createdOrder = await tx.order.update({
              where: { id: existingOrder.id },
              data: {
                paymentAmount: paymentAmount,
                updatedBy: userId,
              },
            });
            console.log(
              `💰 Payment amount updated for existing order ${existingOrder.orderNumber}`
            );
          } else {
            // Return existing order without changes
            createdOrder = existingOrder;
            console.log(
              `ℹ️ PI ${piInvoice.piNumber} already confirmed with order ${existingOrder.orderNumber}`
            );
          }
        }
      }

      // Handle payment amount update for confirmed orders (when status is not changing to confirmed)
      if (status !== 'confirmed' && paymentAmount !== null) {
        const existingOrder = await tx.order.findFirst({
          where: { piInvoiceId: id },
        });

        if (existingOrder) {
          createdOrder = await tx.order.update({
            where: { id: existingOrder.id },
            data: {
              paymentAmount: paymentAmount,
              updatedBy: userId,
            },
          });
          console.log(
            `💰 Payment amount updated for order ${existingOrder.orderNumber}`
          );
        }
      }

      return { updated, createdOrder };
    });

    // Return response with order creation information
    let message = `PI status updated to ${status}`;

    if (updatedPi.createdOrder) {
      if (
        updatedPi.createdOrder.orderNumber &&
        piInvoice.status !== 'confirmed'
      ) {
        message += ` and Order ${updatedPi.createdOrder.orderNumber} created automatically`;
      } else if (piInvoice.status === 'confirmed' && status === 'confirmed') {
        message = `PI is already confirmed with Order ${updatedPi.createdOrder.orderNumber}`;
      } else if (paymentAmount !== null) {
        message += ` and payment amount updated`;
      }

      if (paymentAmount !== null) {
        message += ` with payment amount ₹${paymentAmount}`;
      }
    }

    const response = {
      piInvoice: updatedPi.updated,
      orderCreated:
        !!updatedPi.createdOrder && piInvoice.status !== 'confirmed',
      order: updatedPi.createdOrder,
      paymentAmountUpdated: paymentAmount !== null,
      showOrderPrompt:
        status === 'confirmed' &&
        piInvoice.status !== 'confirmed' &&
        !updatedPi.createdOrder,
      alreadyConfirmed:
        piInvoice.status === 'confirmed' && status === 'confirmed',
      message,
    };

    return response;
  } catch (error) {
    console.error('Error updating PI invoice status with history:', error);
    throw error;
  }
};

const generatePiInvoicePdf = async (
  id,
  companyId,
  logoBase64 = null,
  paymentLink = null
) => {
  try {
    const piInvoice = await getPiInvoiceById(id, companyId);

    const templatePath = join(__dirname, '../views/pi-invoice-template.ejs');
    const htmlContent = await ejs.renderFile(templatePath, {
      piInvoice,
      logoBase64,
      paymentLink,
    });

    return await generatePDF(htmlContent);
  } catch (error) {
    console.error('Error generating PI invoice PDF:', error);
    throw new Error(`Failed to generate PI invoice PDF: ${error.message}`);
  }
};

const getPiInvoiceHistory = async (piInvoiceId, companyId) => {
  // First verify the invoice belongs to the company
  const piInvoice = await prisma.piInvoice.findFirst({
    where: { id: piInvoiceId, companyId },
  });

  if (!piInvoice) {
    throw new ApiError(404, 'PI Invoice not found');
  }

  // Get history records
  const history = await prisma.piInvoiceHistory.findMany({
    where: { piInvoiceId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return history;
};

const getPiInvoicesForOrderCreation = async (companyId) => {
  const confirmedPis = await prisma.piInvoice.findMany({
    where: {
      companyId,
      status: 'confirmed',
      orders: {
        none: {}, // PIs that don't have any orders yet
      },
    },
    include: {
      party: {
        select: { id: true, companyName: true },
      },
      products: {
        select: { id: true, productName: true, quantity: true, unit: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return confirmedPis;
};

const updatePiAmountDirect = async (
  id,
  totalAmount,
  userId,
  companyId,
  advanceAmount = null
) => {
  const existingPi = await prisma.piInvoice.findFirst({
    where: { id, companyId },
  });

  if (!existingPi) {
    throw new ApiError(404, 'PI Invoice not found');
  }

  const updateData = {
    totalAmount: totalAmount,
    updatedBy: userId,
  };

  if (advanceAmount !== null && advanceAmount !== undefined) {
    updateData.advanceAmount = advanceAmount;
  }

  const updatedPi = await prisma.piInvoice.update({
    where: { id },
    data: updateData,
  });

  return updatedPi;
};

export const PiService = {
  createPiInvoice,
  getPiInvoices,
  getPiInvoiceById,
  updatePiInvoice,
  deletePiInvoice,
  addPiProduct,
  updatePiProduct,
  deletePiProduct,
  updatePiStatus,
  generatePiInvoicePdf,
  getPiInvoiceHistory,
  getPiInvoicesForOrderCreation,
  updatePiAmountDirect,
};
