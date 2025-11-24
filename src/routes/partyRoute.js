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


const router = Router();

router.post(
  '/create/party',
  verifyJWT,
  requireCompany,
  createParty
);

router.get(
  '/get-all/parties',
  verifyJWT,
  requireCompany,
  filterByRole,
  getParties
);

router.get('/stats', verifyJWT, requireCompany, getPartyStats);

router.get(
  '/get/party/:id',
  verifyJWT,
  requireCompany,
  getPartyById
);

router.put(
  '/update/party/:id',
  verifyJWT,
  requireCompany,
  updateParty
);

router.delete(
  '/delete/party/:id',
  verifyJWT,
  requireCompany,
  deleteParty
);

export default router;
