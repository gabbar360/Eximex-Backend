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
import {
  applyDataFilters,
  checkEntityOwnership,
  ensureEntityScoping,
} from '../middleware/dataAccess.js';


const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);
router.use(requireCompany);

// PI Invoice routes
router.post(
  '/create/pi-invoice',
  ensureEntityScoping,
  createPiInvoice
);
router.get(
  '/get-all/pi-invoices',
  applyDataFilters('piInvoice'),
  filterByRole,
  getPiInvoices
);
router.get(
  '/get-pi-invoice/:id',
  checkEntityOwnership('piInvoice'),
  getPiInvoiceById
);
router.get('/:id/download-pdf', downloadPiInvoicePdf);
router.get('/:id/history', getPiInvoiceHistory);
router.get('/confirmed-for-order', getConfirmedPisForOrder);
router.put(
  '/update/pi-invoice/:id',
  checkEntityOwnership('piInvoice'),
  updatePiInvoice
);
router.delete(
  '/delete/pi-invoice/:id',
  checkEntityOwnership('piInvoice'),
  deletePiInvoice
);
router.put(
  '/:id/update-pi-status',
  checkEntityOwnership('piInvoice'),
  updatePiStatus
);
router.put(
  '/:id/update-amount',
  checkEntityOwnership('piInvoice'),
  updatePiAmount
);
router.post(
  '/:id/email',
  checkEntityOwnership('piInvoice'),
  emailInvoice
);

// PI Product routes

export default router;
