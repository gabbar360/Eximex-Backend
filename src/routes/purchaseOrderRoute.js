import express from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getFormData,
  generatePurchaseOrderPDF,
} from '../controller/purchaseOrderController.js';
import {
  authenticate,
  requireCompany,
  filterByRole,
} from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
} from '../validations/purchaseOrder.validation.js';
import {
  applyDataFilters,
  checkEntityOwnership,
  ensureEntityScoping,
} from '../middleware/dataAccess.js';

const router = express.Router();

// All routes require authentication and company
router.use(authenticate);
router.use(requireCompany);

// Get form data (company and vendors)
router.get('/form-data', getFormData);

// CRUD routes
router.post(
  '/purchase-order',
  ensureEntityScoping,
  validateRequest(createPurchaseOrderSchema),
  createPurchaseOrder
);
router.get(
  '/purchase-order',
  applyDataFilters('purchaseOrder'),
  filterByRole,
  getPurchaseOrders
);
router.get(
  '/purchase-order/:id/pdf',
  checkEntityOwnership('purchaseOrder'),
  generatePurchaseOrderPDF
);
router.get(
  '/purchase-order/:id',
  checkEntityOwnership('purchaseOrder'),
  getPurchaseOrderById
);
router.put(
  '/purchase-order/:id',
  checkEntityOwnership('purchaseOrder'),
  validateRequest(updatePurchaseOrderSchema),
  updatePurchaseOrder
);
router.delete(
  '/purchase-order/:id',
  checkEntityOwnership('purchaseOrder'),
  deletePurchaseOrder
);

export default router;
