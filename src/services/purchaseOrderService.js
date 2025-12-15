import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/ApiError.js';
import { PDFService } from './pdfService.js';

const prisma = new PrismaClient();

// Generate PO Number
const generatePoNumber = async (companyId) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const lastPo = await prisma.purchaseOrder.findFirst({
    where: {
      companyId,
      poNumber: {
        startsWith: `PO-${year}${month}`,
      },
    },
    orderBy: { poNumber: 'desc' },
  });

  let nextNumber = 1;
  if (lastPo) {
    const lastNumber = parseInt(lastPo.poNumber.split('-').pop());
    nextNumber = lastNumber + 1;
  }

  return `PO-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
};

// Calculate totals
const calculateTotals = (items, cgstRate = 6, sgstRate = 6) => {
  const subTotal = items.reduce(
    (sum, item) => sum + (item.amount || item.quantity * item.rate),
    0
  );
  const cgstAmount = subTotal * (cgstRate / 100);
  const sgstAmount = subTotal * (sgstRate / 100);
  const totalAmount = subTotal + cgstAmount + sgstAmount;

  return { subTotal, cgstAmount, sgstAmount, totalAmount };
};

// Create Purchase Order
const createPurchaseOrder = async (data, userId, companyId) => {
  console.log('Incoming request data:', JSON.stringify(data, null, 2)); // Debug log
  const { items, ...poData } = data;

  // Generate PO number if not provided
  if (!poData.poNumber) {
    poData.poNumber = await generatePoNumber(companyId);
  }

  // Calculate totals
  const totals = calculateTotals(
    items,
    poData.cgstRate,
    poData.sgstRate
  );

  // Prepare items with calculated amounts
  const processedItems = items.map((item, index) => ({
    ...item,
    amount: item.amount || item.quantity * item.rate,
    lineNumber: item.lineNumber || index + 1,
  }));

  // Set vendorName from supplierName if not provided
  if (!poData.vendorName && poData.supplierName) {
    poData.vendorName = poData.supplierName;
  }

  // Extract fields for mapping
  const {
    gstin,
    supplierName,
    supplierAddress,
    supplierGstNumber,
    vendorAddress,
    vendorGstin,
    ...cleanPoData
  } = poData;

  console.log('Extracted fields:', {
    supplierAddress,
    supplierGstNumber,
    vendorAddress,
    vendorGstin,
  }); // Debug log

  // Convert dates to proper format
  if (cleanPoData.poDate) {
    cleanPoData.poDate = new Date(cleanPoData.poDate);
  }
  if (cleanPoData.deliveryDate) {
    cleanPoData.deliveryDate = new Date(cleanPoData.deliveryDate);
  }

  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      ...cleanPoData,
      companyGstin: gstin || '',
      vendorAddress: vendorAddress || supplierAddress || '',
      vendorGstin: vendorGstin || supplierGstNumber || '',
      ...totals,
      companyId,
      createdBy: userId,
      items: {
        create: processedItems,
      },
    },
    include: {
      items: true,
      company: true,
      vendor: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return purchaseOrder;
};

// Get Purchase Orders
const getPurchaseOrders = async (companyId, filters = {}, dataFilters = {}) => {
  const { page = 1, limit = 10, status, vendorId, search } = filters;
  const skip = (page - 1) * limit;

  const where = {
    companyId, // ✅ Always filter by company first
    ...dataFilters, // Then apply role-based filters (createdBy for staff)
    ...(status && { status }),
    ...(vendorId && { vendorId }),
    ...(search && {
      OR: [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        { refNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [purchaseOrders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        vendor: {
          select: { id: true, companyName: true, email: true, phone: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    purchaseOrders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Get Purchase Order by ID
const getPurchaseOrderById = async (id, companyId) => {
  const purchaseOrder = await prisma.purchaseOrder.findFirst({
    where: { id: parseInt(id), companyId },
    include: {
      items: {
        orderBy: { lineNumber: 'asc' },
      },
      company: true,
      vendor: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
      updater: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!purchaseOrder) {
    throw new ApiError(404, 'Purchase Order not found');
  }

  return purchaseOrder;
};

// Update Purchase Order
const updatePurchaseOrder = async (id, data, userId, companyId) => {
  const existingPo = await getPurchaseOrderById(id, companyId);

  const { items, ...poData } = data;

  // Calculate totals if items are provided
  let totals = {};
  if (items) {
    totals = calculateTotals(
      items,
      data.cgstRate || existingPo.cgstRate,
      data.sgstRate || existingPo.sgstRate
    );
  }

  // Remove fields that don't exist in schema and handle gstin mapping
  const {
    gstin,
    supplierName,
    supplierAddress,
    supplierGstNumber,
    ...cleanPoData
  } = poData;

  const updatedPo = await prisma.purchaseOrder.update({
    where: { id: parseInt(id) },
    data: {
      ...cleanPoData,
      ...(gstin !== undefined && { companyGstin: gstin }),
      ...(supplierAddress !== undefined && {
        vendorAddress: supplierAddress,
      }),
      ...(supplierGstNumber !== undefined && {
        vendorGstin: supplierGstNumber,
      }),
      ...totals,
      updatedBy: userId,
      ...(items && {
        items: {
          deleteMany: {},
          create: items.map((item, index) => ({
            ...item,
            amount: item.amount || item.quantity * item.rate,
            lineNumber: item.lineNumber || index + 1,
          })),
        },
      }),
    },
    include: {
      items: {
        orderBy: { lineNumber: 'asc' },
      },
      company: true,
      vendor: true,
      creator: {
        select: { id: true, name: true, email: true },
      },
      updater: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return updatedPo;
};

// Delete Purchase Order
const deletePurchaseOrder = async (id, companyId) => {
  const purchaseOrder = await getPurchaseOrderById(id, companyId);

  await prisma.purchaseOrder.delete({
    where: { id: parseInt(id) },
  });

  return { message: 'Purchase Order deleted successfully' };
};

// Get Company and Vendors for form data
const getFormData = async (companyId) => {
  const [company, vendors] = await Promise.all([
    prisma.companyDetails.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        address: true,
        gstNumber: true,
        email: true,
        phoneNo: true,
        logo: true,
      },
    }),
    prisma.partyList.findMany({
      where: {
        companyId,
        role: 'Vendor',
        status: true,
      },
      select: {
        id: true,
        companyName: true,
        address: true,
        gstNumber: true,
        email: true,
        phone: true,
        contactPerson: true,
      },
    }),
  ]);

  return { company, vendors };
};

// Generate Purchase Order PDF
const generatePurchaseOrderPDF = async (id, companyId, logoBase64 = null) => {
  const purchaseOrder = await getPurchaseOrderById(id, companyId);

  const pdfData = {
    purchaseOrder,
    company: purchaseOrder.company,
    vendor: purchaseOrder.vendor || {
      companyName: purchaseOrder.vendorName,
      address: purchaseOrder.vendorAddress,
      gstNumber: purchaseOrder.vendorGstin,
    },
    items: purchaseOrder.items,
    logoBase64,
  };

  return await PDFService.generatePurchaseOrderPDF(pdfData);
};

export const PurchaseOrderService = {
  generatePoNumber,
  calculateTotals,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getFormData,
  generatePurchaseOrderPDF,
};