import express from 'express';
import {
  createVgmDocument,
  getVgmDocuments,
  getVgmDocument,
  updateVgmDocument,
  deleteVgmDocument,
} from '../controller/vgmController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// VGM Document routes
router.post('/vgm', createVgmDocument);
router.get('/vgm', getVgmDocuments);
router.get('/vgm/:id', getVgmDocument);
router.put('/vgm/:id', updateVgmDocument);
router.delete('/vgm/:id', deleteVgmDocument);

export default router;
