import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  createOrderFromPi,
  downloadOrderInvoicePdf,
  downloadBLDraftPdf,
} from '../controller/orderController.js';
import { verifyJWT, requireCompany, filterByRole } from '../middleware/auth.js';

import { validate } from '../middleware/validate.js';
import { orderValidation } from '../validations/order.validation.js';

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);
router.use(requireCompany);

// Order CRUD routes
router.post(
  '/create-order',
  validate(orderValidation.createOrder),
  createOrder
);
router.get('/get/all-orders', filterByRole, getOrders);
router.get('/get/order-by-id/:id', getOrderById);
router.put(
  '/update-order/:id',
  validate(orderValidation.updateOrder),
  updateOrder
);
router.delete('/delete-order/:id', deleteOrder);

// Status update routes
router.patch(
  '/:id/status',
  validate(orderValidation.updateOrderStatus),
  updateOrderStatus
);

// Create order from confirmed PI

// Download order invoice PDF
router.get('/orders/:id/download-invoice-pdf', downloadOrderInvoicePdf);

// Download BL draft PDF
router.get('/orders/:id/bl-draft-pdf', downloadBLDraftPdf);

export default router;
