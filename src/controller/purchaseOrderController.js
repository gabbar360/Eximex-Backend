import { PurchaseOrderService } from '../services/purchaseOrderService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { handlePurchaseOrderCreation } from '../hooks/accountingHooks.js';
import fs from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Purchase Order
const createPurchaseOrder = asyncHandler(async (req, res) => {
  const purchaseOrder = await PurchaseOrderService.createPurchaseOrder(
    req.body,
    req.user.id,
    req.user.companyId
  );

  // Auto-create accounting entry
  await handlePurchaseOrderCreation(purchaseOrder.id);

  res
    .status(201)
    .json(
      new ApiResponse(201, purchaseOrder, 'Purchase Order created successfully')
    );
});

// Get Purchase Orders
const getPurchaseOrders = asyncHandler(async (req, res) => {
  const result = await PurchaseOrderService.getPurchaseOrders(
    req.user.companyId,
    req.query,
    req.roleFilter || {}
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, result, 'Purchase Orders retrieved successfully')
    );
});

// Get Purchase Order by ID
const getPurchaseOrderById = asyncHandler(async (req, res) => {
  const purchaseOrder = await PurchaseOrderService.getPurchaseOrderById(
    req.params.id,
    req.user.companyId
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        purchaseOrder,
        'Purchase Order retrieved successfully'
      )
    );
});

// Update Purchase Order
const updatePurchaseOrder = asyncHandler(async (req, res) => {
  const purchaseOrder = await PurchaseOrderService.updatePurchaseOrder(
    req.params.id,
    req.body,
    req.user.id,
    req.user.companyId
  );

  res
    .status(200)
    .json(
      new ApiResponse(200, purchaseOrder, 'Purchase Order updated successfully')
    );
});

// Delete Purchase Order
const deletePurchaseOrder = asyncHandler(async (req, res) => {
  const result = await PurchaseOrderService.deletePurchaseOrder(
    req.params.id,
    req.user.companyId
  );

  res
    .status(200)
    .json(new ApiResponse(200, result, 'Purchase Order deleted successfully'));
});

// Get Form Data (Company and Vendors)
const getFormData = asyncHandler(async (req, res) => {
  const formData = await PurchaseOrderService.getFormData(req.user.companyId);

  res
    .status(200)
    .json(new ApiResponse(200, formData, 'Form data retrieved successfully'));
});

// Generate Purchase Order PDF
const generatePurchaseOrderPDF = asyncHandler(async (req, res) => {
  const purchaseOrder = await PurchaseOrderService.getPurchaseOrderById(
    req.params.id,
    req.user.companyId
  );

  // Convert company logo to base64
  let logoBase64 = null;
  try {
    if (purchaseOrder.company?.logo) {
      const logoFilename = purchaseOrder.company.logo.split('/').pop();
      const logoPath = join(__dirname, '../../uploads/logos', logoFilename);
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = logoBuffer.toString('base64');
      }
    }
  } catch (error) {
    console.error('Error reading company logo file:', error);
  }

  const pdf = await PurchaseOrderService.generatePurchaseOrderPDF(
    req.params.id,
    req.user.companyId,
    logoBase64
  );

  // Generate filename with PO number
  const poNumber = purchaseOrder.poNumber || `PO-${req.params.id}`;
  const filename = `${poNumber.replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(pdf);
});

export {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getFormData,
  generatePurchaseOrderPDF,
};
