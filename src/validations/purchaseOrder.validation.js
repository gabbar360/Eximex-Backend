import Joi from 'joi';

const createPurchaseOrderSchema = Joi.object({
  poNumber: Joi.string().optional(),
  poDate: Joi.date().required(),
  deliveryDate: Joi.date().optional(),
  refNumber: Joi.string().optional(),
  placeOfSupply: Joi.string().optional(),

  // Company Details
  companyName: Joi.string().optional(),
  companyAddress: Joi.string().optional().allow(''),
  gstin: Joi.string().optional().allow(''),
  companyGstin: Joi.string().optional().allow(''),

  // Vendor Details
  vendorId: Joi.number().integer().optional(),
  vendorName: Joi.string().optional(),
  vendorAddress: Joi.string().optional(),
  vendorGstin: Joi.string().optional().allow('', null),

  // Supplier Details (from frontend)
  supplierName: Joi.string().optional(),
  supplierAddress: Joi.string().optional(),
  supplierGstNumber: Joi.string().optional(),

  // Delivery Details
  deliverToName: Joi.string().optional().allow(''),
  deliverToAddress: Joi.string().optional().allow(''),
  deliverToGstin: Joi.string().optional().allow(''),
  deliverToContact: Joi.string().optional().allow(''),

  // Tax Settings
  currency: Joi.string().default('INR'),
  cgstRate: Joi.number().min(0).max(50).default(6),
  sgstRate: Joi.number().min(0).max(50).default(6),

  // Additional Information
  notes: Joi.string().optional(),
  termsConditions: Joi.string().optional(),

  // Authorization
  signatureCompany: Joi.string().optional(),
  signatureTitle: Joi.string().optional(),
  authorizedBy: Joi.string().optional(),

  // Items
  items: Joi.array()
    .items(
      Joi.object({
        itemDescription: Joi.string().required(),
        hsnSac: Joi.string().optional(),
        unit: Joi.string().optional().allow('', null),
        quantity: Joi.number().min(0).required(),
        rate: Joi.number().min(0).required(),
        amount: Joi.number().min(0).optional(),
        lineNumber: Joi.number().integer().min(1).optional(),
      })
    )
    .min(1)
    .required(),
});

const updatePurchaseOrderSchema = Joi.object({
  poDate: Joi.date().optional(),
  deliveryDate: Joi.date().optional(),
  refNumber: Joi.string().optional(),
  placeOfSupply: Joi.string().optional(),

  // Company Details
  companyName: Joi.string().optional(),
  companyAddress: Joi.string().optional().allow(''),
  gstin: Joi.string().optional().allow(''),
  companyGstin: Joi.string().optional().allow(''),

  // Vendor Details
  vendorId: Joi.number().integer().optional(),
  vendorName: Joi.string().optional(),
  vendorAddress: Joi.string().optional(),
  vendorGstin: Joi.string().optional().allow('', null),

  // Supplier Details (from frontend)
  supplierName: Joi.string().optional(),
  supplierAddress: Joi.string().optional(),
  supplierGstNumber: Joi.string().optional(),

  // Delivery Details
  deliverToName: Joi.string().optional(),
  deliverToAddress: Joi.string().optional(),
  deliverToGstin: Joi.string().optional(),
  deliverToContact: Joi.string().optional(),

  // Tax Settings
  currency: Joi.string().optional(),
  cgstRate: Joi.number().min(0).max(50).optional(),
  sgstRate: Joi.number().min(0).max(50).optional(),

  // Additional Information
  notes: Joi.string().optional(),
  termsConditions: Joi.string().optional(),

  // Authorization
  signatureCompany: Joi.string().optional(),
  signatureTitle: Joi.string().optional(),
  authorizedBy: Joi.string().optional(),

  // Status
  status: Joi.string()
    .valid('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
    .optional(),

  // Items
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().optional(),
        itemDescription: Joi.string().required(),
        hsnSac: Joi.string().optional(),
        unit: Joi.string().optional().allow('', null),
        quantity: Joi.number().min(0).required(),
        rate: Joi.number().min(0).required(),
        amount: Joi.number().min(0).optional(),
        lineNumber: Joi.number().integer().min(1).optional(),
      })
    )
    .optional(),
});

export { createPurchaseOrderSchema, updatePurchaseOrderSchema };
