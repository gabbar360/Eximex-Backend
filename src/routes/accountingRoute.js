import { Router } from 'express';
import {
  getLedger,
  getProfitLoss,
  getBalanceSheet,
  exportToCSV,
  exportToExcel,
  createEntry,
} from '../controller/accountingController.js';
import { verifyJWT, requireCompany, filterByRole } from '../middleware/auth.js';

const router = Router();

// Accounting routes
router.get(
  '/accounting/ledger',
  verifyJWT,
  requireCompany,
  filterByRole,
  getLedger
);
router.get(
  '/accounting/profit-loss',
  verifyJWT,
  requireCompany,
  filterByRole,
  getProfitLoss
);
router.get(
  '/accounting/balance-sheet',
  verifyJWT,
  requireCompany,
  filterByRole,
  getBalanceSheet
);
router.get(
  '/accounting/export/csv',
  verifyJWT,
  requireCompany,
  filterByRole,
  exportToCSV
);
router.get(
  '/accounting/export/excel',
  verifyJWT,
  requireCompany,
  filterByRole,
  exportToExcel
);
router.post('/accounting/entry', verifyJWT, requireCompany, createEntry);

export default router;
