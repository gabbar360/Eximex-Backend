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

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// VGM Document routes
router.post('/vgm', createVgmDocument);
router.get('/vgm', getVgmDocuments);
router.get('/vgm/:id', getVgmDocument);
router.get('/vgm/:id/pdf', generateVgmPdf);
router.put('/vgm/:id', updateVgmDocument);
router.delete('/vgm/:id', deleteVgmDocument);

export default router;
