import { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  getAttributeTemplatesByCategoryId,
} from '../controller/categoryController.js';
import { validate } from '../middleware/validate.js';
import { categoryValidation } from '../validations/category.validation.js';
import { verifyJWT, requireCompany, filterByRole } from '../middleware/auth.js';

import {
  applyDataFilters,
  checkEntityOwnership,
  ensureEntityScoping,
} from '../middleware/dataAccess.js';
const router = Router();

router.post(
  '/create/category',
  verifyJWT,
  requireCompany,
  ensureEntityScoping,
  validate(categoryValidation.createCategory),
  createCategory
);

// Category routes
router.get(
  '/get-all/categories',
  verifyJWT,
  requireCompany,
  applyDataFilters('itemCategory'),
  filterByRole,
  getAllCategories
);

router.get(
  '/get/category/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('itemCategory'),
  validate(categoryValidation.getCategory),
  getCategoryById
);
router.put(
  '/update/category/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('itemCategory'),
  validate(categoryValidation.updateCategory),
  updateCategory
);
router.delete(
  '/delete/category/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('itemCategory'),
  validate(categoryValidation.getCategory),
  deleteCategory
);
router.get('/stats/categories', verifyJWT, requireCompany, getCategoryStats);
router.get(
  '/categories/:categoryId/attribute',
  verifyJWT,
  requireCompany,
  getAttributeTemplatesByCategoryId
);

export default router;
