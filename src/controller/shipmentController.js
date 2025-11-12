import shipmentService from '../services/shipmentService.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createShipmentSchema, updateShipmentSchema } from '../validations/shipment.validation.js';

// Create shipment
const createShipment = asyncHandler(async (req, res) => {
  const { error, value } = createShipmentSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, null, error.details[0].message));
  }

  const shipment = await shipmentService.createShipment(
    value,
    req.user.id,
    req.user.companyId
  );

  res.status(201).json(
    new ApiResponse(201, shipment, 'Shipment created successfully')
  );
});

// Get shipment by ID
const getShipmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const shipment = await shipmentService.getShipmentById(
    parseInt(id),
    req.user.companyId
  );

  res.status(200).json(
    new ApiResponse(200, shipment, 'Shipment fetched successfully')
  );
});

// Get shipment by order ID
const getShipmentByOrderId = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const shipment = await shipmentService.getShipmentByOrderId(
    parseInt(orderId),
    req.user.companyId
  );

  res.status(200).json(
    new ApiResponse(200, shipment, 'Shipment fetched successfully')
  );
});

// Update shipment
const updateShipment = asyncHandler(async (req, res) => {
  const { error, value } = updateShipmentSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, null, error.details[0].message));
  }

  const { id } = req.params;
  const shipment = await shipmentService.updateShipment(
    parseInt(id),
    value,
    req.user.id,
    req.user.companyId
  );

  res.status(200).json(
    new ApiResponse(200, shipment, 'Shipment updated successfully')
  );
});

// Get all shipments
const getShipments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, orderId } = req.query;
  
  const filters = {};
  if (status) filters.status = status;
  if (orderId) filters.orderId = parseInt(orderId);

  const result = await shipmentService.getShipments(
    req.user.companyId,
    parseInt(page),
    parseInt(limit),
    filters
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Shipments fetched successfully')
  );
});

// Delete shipment
const deleteShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await shipmentService.deleteShipment(
    parseInt(id),
    req.user.companyId
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Shipment deleted successfully')
  );
});

export {
  createShipment,
  getShipmentById,
  getShipmentByOrderId,
  updateShipment,
  getShipments,
  deleteShipment
};