import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
  createOrderFromPi,
  downloadOrderInvoicePdf,
  downloadBLDraftPdf,
} from '../controller/orderController.js';
import { verifyJWT, requireCompany, filterByRole } from '../middleware/auth.js';
import {
  applyDataFilters,
  checkEntityOwnership,
  ensureEntityScoping,
} from '../middleware/dataAccess.js';
import { ActivityLogService } from '../services/activityLogService.js';

import { validate } from '../middleware/validate.js';
import { orderValidation } from '../validations/order.validation.js';

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);
router.use(requireCompany);

// Order CRUD routes
router.post(
  '/create-order',
  ensureEntityScoping,
  validate(orderValidation.createOrder),
  ActivityLogService.createActivityLogger('Order'),
  createOrder
);
router.get(
  '/get/all-orders',
  applyDataFilters('order'),
  filterByRole,
  getOrders
);
router.get('/get/order-by-id/:id', checkEntityOwnership('order'), getOrderById);
router.put(
  '/update-order/:id',
  checkEntityOwnership('order'),
  validate(orderValidation.updateOrder),
  ActivityLogService.createActivityLogger('Order'),
  updateOrder
);
router.delete(
  '/delete-order/:id',
  checkEntityOwnership('order'),
  ActivityLogService.createActivityLogger('Order'),
  deleteOrder
);

// Status update routes
router.patch(
  '/:id/status',
  validate(orderValidation.updateOrderStatus),
  updateOrderStatus
);
router.patch(
  '/:id/payment-status',
  validate(orderValidation.updatePaymentStatus),
  updatePaymentStatus
);

// Create order from confirmed PI

// Download order invoice PDF
router.get('/orders/:id/download-invoice-pdf', downloadOrderInvoicePdf);


// Download BL draft PDF
router.get('/orders/:id/bl-draft-pdf', downloadBLDraftPdf);

export default router;
