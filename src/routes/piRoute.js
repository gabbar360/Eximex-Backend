import { Router } from 'express';
import {
  createPiInvoice,
  getPiInvoices,
  getPiInvoiceById,
  updatePiInvoice,
  deletePiInvoice,
  updatePiStatus,
  addPiProduct,
  updatePiProduct,
  deletePiProduct,
  downloadPiInvoicePdf,
  getPiInvoiceHistory,
  getConfirmedPisForOrder,
  updatePiAmount,
  emailInvoice,
} from '../controller/piController.js';
import { verifyJWT, requireCompany, filterByRole } from '../middleware/auth.js';



const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);
router.use(requireCompany);

// PI Invoice routes
router.post(
  '/create/pi-invoice',
  createPiInvoice
);
router.get(
  '/get-all/pi-invoices',
  filterByRole,
  getPiInvoices
);
router.get(
  '/get-pi-invoice/:id',
  getPiInvoiceById
);
router.get('/download-pdf/:id', downloadPiInvoicePdf);
router.get('/:id/history', getPiInvoiceHistory);
router.get('/confirmed-for-order', getConfirmedPisForOrder);
router.put(
  '/update/pi-invoice/:id',
  updatePiInvoice
);
router.delete(
  '/delete/pi-invoice/:id',
  deletePiInvoice
);
router.put(
  '/:id/update-pi-status',
  updatePiStatus
);
router.put(
  '/:id/update-amount',
  updatePiAmount
);
router.post(
  '/:id/email',
  emailInvoice
);

// PI Product routes

export default router;
