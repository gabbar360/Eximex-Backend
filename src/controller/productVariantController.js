import { asyncHandler } from '../utils/asyncHandler.js';
import { ProductVariantService } from '../services/productVariantService.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createProductVariant = asyncHandler(async (req, res) => {
  const productVariant = await ProductVariantService.createProductVariant(
    req.body,
    req.user.id,
    req.user.companyId
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        productVariant,
        'Product variant created successfully'
      )
    );
});

export const getAllProductVariants = asyncHandler(async (req, res) => {
  const productVariants = await ProductVariantService.getAllProductVariants(
    req.user.companyId,
    req.query
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        productVariants,
        'Product variants fetched successfully'
      )
    );
});

export const getProductVariantById = asyncHandler(async (req, res) => {
  const productVariant = await ProductVariantService.getProductVariantById(
    req.params.id,
    true
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        productVariant,
        'Product variant fetched successfully'
      )
    );
});

export const updateProductVariant = asyncHandler(async (req, res) => {
  const updated = await ProductVariantService.updateProductVariant(
    req.params.id,
    req.body
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updated, 'Product variant updated successfully')
    );
});

export const deleteProductVariant = asyncHandler(async (req, res) => {
  const result = await ProductVariantService.deleteProductVariant(
    req.params.id
  );

  return res.status(200).json(new ApiResponse(200, null, result.message));
});

export const getProductVariantStats = asyncHandler(async (req, res) => {
  const stats = await ProductVariantService.getProductVariantStats(
    req.user.companyId
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, stats, 'Product variant stats fetched successfully')
    );
});
