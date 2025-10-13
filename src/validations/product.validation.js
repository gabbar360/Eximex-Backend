import Joi from 'joi';

const createProduct = {
  body: Joi.object()
    .keys({
      // Basic product info
      name: Joi.string().required().trim(),
      sku: Joi.string().optional().trim(), // Make SKU optional, will be auto-generated if not provided
      description: Joi.string().optional().trim().allow(''),
      price: Joi.number().min(0).optional().allow(null),
      currency: Joi.string().optional().default('USD'),

      // Category info
      categoryId: Joi.number().integer().optional().allow(null),
      subCategoryId: Joi.number().integer().optional().allow(null),

      // Legacy weight and area fields (keeping for backward compatibility)
      weightUnit: Joi.string().valid('kg', 'lbs').default('kg'),
      weightType: Joi.string()
        .valid('per_box', 'per_piece', 'per_carton')
        .default('per_piece'),
      weight: Joi.number().min(0).optional().allow(null),
      areaUnit: Joi.string().valid('sqmt', 'sqft').default('sqmt'),
      areaType: Joi.string().valid('per_box', 'per_piece').default('per_piece'),
      coverArea: Joi.number().min(0).optional().allow(null),
      piecePerBox: Joi.number().integer().min(1).optional().allow(null),

      // New packaging fields
      totalBoxes: Joi.number().integer().min(1).optional().allow(null),
      grossWeightPerBox: Joi.number().min(0).optional().allow(null),
      grossWeightUnit: Joi.string().optional().default('kg'),
      packagingMaterialWeight: Joi.number().min(0).optional().allow(null),
      packagingMaterialWeightUnit: Joi.string().optional().default('g'),

      // Calculated fields
      totalPieces: Joi.number().integer().min(0).optional().allow(null),
      totalGrossWeight: Joi.number().min(0).optional().allow(null),
      totalGrossWeightUnit: Joi.string().optional().default('kg'),

      // Volume fields
      volumeLength: Joi.number().min(0).optional().allow(null),
      volumeWidth: Joi.number().min(0).optional().allow(null),
      volumeHeight: Joi.number().min(0).optional().allow(null),
      volumePerBox: Joi.number().min(0).optional().allow(null),
      totalVolume: Joi.number().min(0).optional().allow(null),

      // Dynamic packaging hierarchy fields (will be validated separately)
      packagingHierarchyData: Joi.object().optional().allow(null),
    })
    .unknown(true), // Allow unknown fields for dynamic packaging hierarchy
};

const updateProduct = {
  params: Joi.object().keys({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object()
    .keys({
      // Basic product info
      name: Joi.string().optional().trim(),
      sku: Joi.string().optional().trim(),
      description: Joi.string().optional().trim().allow(''),
      price: Joi.number().min(0).optional().allow(null),
      currency: Joi.string().optional(),

      // Category info
      categoryId: Joi.number().integer().optional().allow(null),
      subCategoryId: Joi.number().integer().optional().allow(null),

      // Legacy weight and area fields
      weightUnit: Joi.string().valid('kg', 'lbs').optional(),
      weightType: Joi.string()
        .valid('per_box', 'per_piece', 'per_carton')
        .optional(),
      weight: Joi.number().min(0).optional().allow(null),
      areaUnit: Joi.string().valid('sqmt', 'sqft').optional(),
      areaType: Joi.string().valid('per_box', 'per_piece').optional(),
      coverArea: Joi.number().min(0).optional().allow(null),
      piecePerBox: Joi.number().integer().min(1).optional().allow(null),

      // New packaging fields
      totalBoxes: Joi.number().integer().min(1).optional().allow(null),
      grossWeightPerBox: Joi.number().min(0).optional().allow(null),
      grossWeightUnit: Joi.string().optional(),
      packagingMaterialWeight: Joi.number().min(0).optional().allow(null),
      packagingMaterialWeightUnit: Joi.string().optional(),

      // Calculated fields
      totalPieces: Joi.number().integer().min(0).optional().allow(null),
      totalGrossWeight: Joi.number().min(0).optional().allow(null),
      totalGrossWeightUnit: Joi.string().optional(),

      // Volume fields
      volumeLength: Joi.number().min(0).optional().allow(null),
      volumeWidth: Joi.number().min(0).optional().allow(null),
      volumeHeight: Joi.number().min(0).optional().allow(null),
      volumePerBox: Joi.number().min(0).optional().allow(null),
      totalVolume: Joi.number().min(0).optional().allow(null),

      // Dynamic packaging hierarchy fields
      packagingHierarchyData: Joi.object().optional().allow(null),
    })
    .unknown(true), // Allow unknown fields for dynamic packaging hierarchy
};

const getProduct = {
  params: Joi.object().keys({
    id: Joi.number().integer().required(),
  }),
};

export const productValidation = {
  createProduct,
  updateProduct,
  getProduct,
};
