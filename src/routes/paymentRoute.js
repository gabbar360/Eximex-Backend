import express from 'express';
import {
  createPayment,
  getPayments,
  updatePaymentStatus,
  getDuePayments,
} from '../controller/paymentController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyJWT);

router.post('/payments', createPayment);
router.get('/payments', getPayments);
router.get('/payments/due', getDuePayments);
router.patch('/payments/:id/status', updatePaymentStatus);

export default router;
