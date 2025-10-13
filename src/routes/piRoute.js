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
import { ActivityLogService } from '../services/activityLogService.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);
router.use(requireCompany);

// PI Invoice routes
router.post(
  '/create/pi-invoice',
  ensureEntityScoping,
  ActivityLogService.createActivityLogger('PiInvoice'),
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
  ActivityLogService.createActivityLogger('PiInvoice'),
  updatePiInvoice
);
router.delete(
  '/delete/pi-invoice/:id',
  checkEntityOwnership('piInvoice'),
  ActivityLogService.createActivityLogger('PiInvoice'),
  deletePiInvoice
);
router.put(
  '/:id/update-pi-status',
  checkEntityOwnership('piInvoice'),
  ActivityLogService.createActivityLogger('PiInvoice'),
  updatePiStatus
);
router.put('/:id/update-amount', updatePiAmount);
router.post('/:id/email', emailInvoice);

// PI Product routes
router.post('/:piId/products', addPiProduct);
router.put('/:piId/products/:productId', updatePiProduct);
router.delete('/:piId/products/:productId', deletePiProduct);

export default router;
