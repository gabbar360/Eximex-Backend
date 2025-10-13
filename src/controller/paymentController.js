import paymentService from '../services/paymentService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.createPayment(req.body, req.user.id);
  res.status(201).json(new ApiResponse(201, payment, 'Payment created successfully'));
});

const getPayments = asyncHandler(async (req, res) => {
  try {
    const payments = await paymentService.getPayments(req.user.companyId, req.query);
    res.json(new ApiResponse(200, payments || [], 'Payments retrieved successfully'));
  } catch (error) {
    console.error('Payment table not found:', error);
    res.json(new ApiResponse(200, [], 'Payment table not created yet'));
  }
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const payment = await paymentService.updatePaymentStatus(req.params.id, req.body.status);
  res.json(new ApiResponse(200, payment, 'Payment status updated'));
});

const getDuePayments = asyncHandler(async (req, res) => {
  try {
    const duePayments = await paymentService.getDuePayments(req.user.companyId);
    res.json(new ApiResponse(200, duePayments || [], 'Due payments retrieved'));
  } catch (error) {
    console.error('Payment table not found:', error);
    res.json(new ApiResponse(200, [], 'Payment table not created yet'));
  }
});

export {
  createPayment,
  getPayments,
  updatePaymentStatus,
  getDuePayments
};