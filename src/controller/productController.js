import { asyncHandler } from '../utils/asyncHandler.js';
import { ProductService } from '../services/productService.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.createProduct(
    req.body,
    req.user.id,
    req.user.companyId
  );

  return res
    .status(201)
    .json(new ApiResponse(201, product, 'Product created successfully'));
});

export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await ProductService.getAllProducts(
    req.user.companyId,
    req.query,
    req.roleFilter || {}
  );

  return res
    .status(200)
    .json(new ApiResponse(200, products, 'Products fetched successfully'));
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await ProductService.getProductById(req.params.id, true);

  return res
    .status(200)
    .json(new ApiResponse(200, product, 'Product fetched successfully'));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const updated = await ProductService.updateProduct(
    req.params.id,
    req.body,
    req.user.companyId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updated, 'Product updated successfully'));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await ProductService.deleteProduct(
    req.params.id,
    req.user.companyId
  );

  return res.status(200).json(new ApiResponse(200, null, result.message));
});

export const getProductStats = asyncHandler(async (req, res) => {
  const stats = await ProductService.getProductStats(req.user.companyId);

  return res
    .status(200)
    .json(new ApiResponse(200, stats, 'Product stats fetched successfully'));
});

// Product Variant CRUD
