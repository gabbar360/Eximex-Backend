import express from 'express';
import {
  createShipment,
  getShipmentById,
  getShipmentByOrderId,
  updateShipment,
  getShipments,
  deleteShipment
} from '../controller/shipmentController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// Routes
router.post('/shipments', createShipment);
router.get('/shipments', getShipments);
router.get('/shipments/:id', getShipmentById);
router.get('/shipments/order/:orderId', getShipmentByOrderId);
router.put('/shipments/:id', updateShipment);
router.delete('/shipments/:id', deleteShipment);

export default router;