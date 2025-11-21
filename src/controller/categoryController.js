import { asyncHandler } from '../utils/asyncHandler.js';
import { CategoryService } from '../services/categoryService.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const createCategory = asyncHandler(async (req, res) => {
  const category = await CategoryService.createCategory(
    req.body,
    req.user.id,
    req.user.companyId
  );
  return res
    .status(201)
    .json(new ApiResponse(201, category, 'Category created successfully'));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await CategoryService.updateCategory(
    req.params.id,
    req.body,
    req.user.id,
    req.user.companyId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, category, 'Category updated successfully'));
});

export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await CategoryService.getAllCategories(
    req.user.companyId,
    req.query,
    req.roleFilter || {}
  );

  return res
    .status(200)
    .json(new ApiResponse(200, categories, 'Categories fetched successfully'));
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await CategoryService.getCategoryById(req.params.id, true);

  return res
    .status(200)
    .json(new ApiResponse(200, category, 'Category fetched successfully'));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await CategoryService.deleteCategory(req.params.id);

  return res.status(200).json(new ApiResponse(200, null, result.message));
});

export const getCategoryStats = asyncHandler(async (req, res) => {
  const stats = await CategoryService.getCategoryStats(req.user.companyId);

  return res
    .status(200)
    .json(new ApiResponse(200, stats, 'Category stats fetched successfully'));
});

export const getAttributeTemplatesByCategoryId = asyncHandler(
  async (req, res) => {
    const templates = await CategoryService.getAttributeTemplatesByCategoryId(
      req.params.categoryId
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          templates,
          'Attribute templates fetched successfully'
        )
      );
  }
);
