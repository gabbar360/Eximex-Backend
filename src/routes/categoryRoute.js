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


const router = Router();

router.post(
  '/create/category',
  verifyJWT,
  requireCompany,
  validate(categoryValidation.createCategory),
  createCategory
);

// Category routes
router.get(
  '/get-all/categories',
  verifyJWT,
  requireCompany,
  filterByRole,
  getAllCategories
);

router.get(
  '/get/category/:id',
  verifyJWT,
  requireCompany,
  validate(categoryValidation.getCategory),
  getCategoryById
);
router.put(
  '/update/category/:id',
  verifyJWT,
  requireCompany,
  validate(categoryValidation.updateCategory),
  updateCategory
);
router.delete(
  '/delete/category/:id',
  verifyJWT,
  requireCompany,
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
