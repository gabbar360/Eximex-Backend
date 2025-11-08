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
import { trackPartyActivity } from '../middleware/activityTracker.js';

const router = Router();

router.post(
  '/create/party',
  verifyJWT,
  requireCompany,
  ensureEntityScoping,
  ActivityLogService.createActivityLogger('Party'),
  trackPartyActivity('CREATE'),
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
  trackPartyActivity('UPDATE'),
  updateParty
);

router.delete(
  '/delete/party/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('partyList'),
  ActivityLogService.createActivityLogger('Party'),
  trackPartyActivity('DELETE'),
  deleteParty
);

export default router;
