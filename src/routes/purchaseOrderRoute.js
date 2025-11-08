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
import { trackActivity } from '../middleware/activityTracker.js';

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
  trackActivity('PurchaseOrder', 'CREATE'),
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
  trackActivity('PurchaseOrder', 'UPDATE'),
  updatePurchaseOrder
);
router.delete(
  '/purchase-order/:id',
  checkEntityOwnership('purchaseOrder'),
  trackActivity('PurchaseOrder', 'DELETE'),
  deletePurchaseOrder
);

export default router;
