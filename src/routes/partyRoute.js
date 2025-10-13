import { Router } from 'express';
import {
  createParty,
  getParties,
  getPartyById,
  updateParty,
  deleteParty,
  getPartyStats,
} from '../controller/partyController.js';
import { verifyJWT, requireCompany, filterByRole } from '../middleware/auth.js';
import {
  applyDataFilters,
  checkEntityOwnership,
  ensureEntityScoping,
} from '../middleware/dataAccess.js';
import { ActivityLogService } from '../services/activityLogService.js';

const router = Router();

router.post(
  '/create/party',
  verifyJWT,
  requireCompany,
  ensureEntityScoping,
  ActivityLogService.createActivityLogger('Party'),
  createParty
);

router.get(
  '/get-all/parties',
  verifyJWT,
  requireCompany,
  applyDataFilters('partyList'),
  filterByRole,
  getParties
);

router.get('/stats', verifyJWT, requireCompany, getPartyStats);

router.get(
  '/get/party/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('partyList'),
  getPartyById
);

router.put(
  '/update/party/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('partyList'),
  ActivityLogService.createActivityLogger('Party'),
  updateParty
);

router.delete(
  '/delete/party/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('partyList'),
  ActivityLogService.createActivityLogger('Party'),
  deleteParty
);

export default router;
