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
router.get('/vgm', getVgmDocuments);
router.get('/vgm/:id', getVgmDocument);
router.get('/vgm/:id/pdf', generateVgmPdf);

export default router;
