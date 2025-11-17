import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
} from '../controller/productController.js';
import { validate } from '../middleware/validate.js';
import { productValidation } from '../validations/product.validation.js';
import { verifyJWT, requireCompany, filterByRole } from '../middleware/auth.js';
import {
  applyDataFilters,
  checkEntityOwnership,
  ensureEntityScoping,
} from '../middleware/dataAccess.js';

const router = Router();

// Product routes
router.get(
  '/get-all/products',
  verifyJWT,
  requireCompany,
  applyDataFilters('product'),
  filterByRole,
  getAllProducts
);

router.get(
  '/get/product/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('product'),
  validate(productValidation.getProduct),
  getProductById
);

router.post(
  '/create/product',
  verifyJWT,
  requireCompany,
  ensureEntityScoping,
  validate(productValidation.createProduct),
  createProduct
);

router.put(
  '/update/product/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('product'),
  validate(productValidation.updateProduct),
  updateProduct
);

router.delete(
  '/delete/product/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('product'),
  validate(productValidation.getProduct),
  deleteProduct
);

router.get('/stats/products', verifyJWT, requireCompany, getProductStats);

export default router;
