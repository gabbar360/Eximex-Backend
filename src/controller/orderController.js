import { OrderService } from '../services/orderService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import fs from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const createOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.createOrder(
    { ...req.body, companyId: req.user.companyId },
    req.user.id
  );
  return res
    .status(201)
    .json(new ApiResponse(201, order, 'Order created successfully'));
});

export const getOrders = asyncHandler(async (req, res) => {
  const result = await OrderService.getOrders(
    req.user.companyId,
    req.query,
    req.roleFilter || {}
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Orders retrieved successfully'));
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await OrderService.getOrderById(
    parseInt(req.params.id),
    req.user.companyId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order retrieved successfully'));
});

export const updateOrder = asyncHandler(async (req, res) => {
  const order = await OrderService.updateOrder(
    parseInt(req.params.id),
    req.body,
    req.user.id,
    req.user.companyId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order updated successfully'));
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await OrderService.updateOrderStatus(
    parseInt(req.params.id),
    req.body.status,
    req.user.id,
    req.user.companyId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, order, 'Order status updated successfully'));
});

export const deleteOrder = asyncHandler(async (req, res) => {
  const result = await OrderService.deleteOrder(
    parseInt(req.params.id),
    req.user.companyId
  );
  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Order deleted successfully'));
});

export const createOrderFromPi = asyncHandler(async (req, res) => {
  const order = await OrderService.createOrderFromPi(
    parseInt(req.params.piId),
    req.user.id,
    req.user.companyId
  );
  return res
    .status(201)
    .json(new ApiResponse(201, order, 'Order created from PI successfully'));
});

export const downloadOrderInvoicePdf = asyncHandler(async (req, res) => {
  const order = await OrderService.getOrderById(
    parseInt(req.params.id),
    req.user.companyId
  );

  // Convert company logo to base64
  let logoBase64 = null;
  try {
    if (order.company?.logo) {
      const logoFilename = order.company.logo.split('/').pop();
      const logoPath = join(__dirname, '../../uploads/logos', logoFilename);
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = logoBuffer.toString('base64');
      }
    }
  } catch (error) {
    console.error('Error reading company logo file:', error);
  }

  const pdfBuffer = await OrderService.generateOrderInvoicePdf(
    parseInt(req.params.id),
    req.user.companyId,
    logoBase64
  );

  // Generate filename
  const partyName = (
    order.piInvoice.partyName ||
    order.piInvoice.party?.companyName ||
    'Customer'
  ).replace(/[^a-zA-Z0-9]/g, '-');
  const orderNumber = order.orderNumber.replace(/[^a-zA-Z0-9]/g, '-');
  const date = new Date().toISOString().split('T')[0];
  const filename = `${partyName}-Invoice-${orderNumber}-${date}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
});

export const downloadBLDraftPdf = asyncHandler(async (req, res) => {
  const order = await OrderService.getOrderById(
    parseInt(req.params.id),
    req.user.companyId
  );

  const pdfBuffer = await OrderService.generateBLDraftPdf(
    parseInt(req.params.id),
    req.user.companyId
  );

  const orderNumber = order.orderNumber.replace(/[^a-zA-Z0-9]/g, '-');
  const date = new Date().toISOString().split('T')[0];
  const filename = `BL-Draft-${orderNumber}-${date}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
});
