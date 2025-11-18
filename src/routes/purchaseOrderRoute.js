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


const router = express.Router();

// All routes require authentication and company
router.use(authenticate);
router.use(requireCompany);

// Get form data (company and vendors)
router.get('/form-data', getFormData);

// CRUD routes
router.post(
  '/purchase-order',
  validateRequest(createPurchaseOrderSchema),
  createPurchaseOrder
);
router.get(
  '/purchase-order',
  filterByRole,
  getPurchaseOrders
);
router.get(
  '/purchase-order/:id/pdf',
  generatePurchaseOrderPDF
);
router.get(
  '/purchase-order/:id',
  getPurchaseOrderById
);
router.put(
  '/purchase-order/:id',
  validateRequest(updatePurchaseOrderSchema),
  updatePurchaseOrder
);
router.delete(
  '/purchase-order/:id',
  deletePurchaseOrder
);

export default router;
