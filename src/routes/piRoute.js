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
import { trackPiInvoiceActivity, trackActivity } from '../middleware/activityTracker.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);
router.use(requireCompany);

// PI Invoice routes
router.post(
  '/create/pi-invoice',
  ensureEntityScoping,
  ActivityLogService.createActivityLogger('PiInvoice'),
  trackPiInvoiceActivity('CREATE'),
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
  trackPiInvoiceActivity('UPDATE'),
  updatePiInvoice
);
router.delete(
  '/delete/pi-invoice/:id',
  checkEntityOwnership('piInvoice'),
  ActivityLogService.createActivityLogger('PiInvoice'),
  trackPiInvoiceActivity('DELETE'),
  deletePiInvoice
);
router.put(
  '/:id/update-pi-status',
  checkEntityOwnership('piInvoice'),
  ActivityLogService.createActivityLogger('PiInvoice'),
  trackPiInvoiceActivity('UPDATE'),
  updatePiStatus
);
router.put('/:id/update-amount', trackPiInvoiceActivity('UPDATE'), updatePiAmount);
router.post('/:id/email', trackPiInvoiceActivity('UPDATE'), emailInvoice);

// PI Product routes
router.post('/:piId/products', trackActivity('PiProduct', 'CREATE'), addPiProduct);
router.put('/:piId/products/:productId', trackActivity('PiProduct', 'UPDATE'), updatePiProduct);
router.delete('/:piId/products/:productId', trackActivity('PiProduct', 'DELETE'), deletePiProduct);

export default router;
