import express from 'express';
import {
  createVgmDocument,
  getVgmDocuments,
  getVgmDocument,
  updateVgmDocument,
  deleteVgmDocument,
  generateVgmPdf,
} from '../controller/vgmController.js';
import { verifyJWT } from '../middleware/auth.js';
import { trackActivity } from '../middleware/activityTracker.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// VGM Document routes
router.post('/vgm', trackActivity('VGM', 'CREATE'), createVgmDocument);
router.get('/vgm', getVgmDocuments);
router.get('/vgm/:id', getVgmDocument);
router.get('/vgm/:id/pdf', generateVgmPdf);
router.put('/vgm/:id', trackActivity('VGM', 'UPDATE'), updateVgmDocument);
router.delete('/vgm/:id', trackActivity('VGM', 'DELETE'), deleteVgmDocument);

export default router;
