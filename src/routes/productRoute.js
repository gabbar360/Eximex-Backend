import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getAllProductVariants,
  getProductVariantById,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
} from '../controller/productController.js';
import { validate } from '../middleware/validate.js';
import { productValidation } from '../validations/product.validation.js';
import { verifyJWT, requireCompany, filterByRole } from '../middleware/auth.js';
import {
  applyDataFilters,
  checkEntityOwnership,
  ensureEntityScoping,
} from '../middleware/dataAccess.js';
import { ActivityLogService } from '../services/activityLogService.js';

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
  ActivityLogService.createActivityLogger('Product'),
  createProduct
);

router.put(
  '/update/product/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('product'),
  validate(productValidation.updateProduct),
  ActivityLogService.createActivityLogger('Product'),
  updateProduct
);

router.delete(
  '/delete/product/:id',
  verifyJWT,
  requireCompany,
  checkEntityOwnership('product'),
  validate(productValidation.getProduct),
  ActivityLogService.createActivityLogger('Product'),
  deleteProduct
);

router.get('/stats/products', verifyJWT, requireCompany, getProductStats);

// Product Variant routes
router.get(
  '/get-all/product-variants',
  verifyJWT,
  requireCompany,
  getAllProductVariants
);

router.get(
  '/get/product-variant/:id',
  verifyJWT,
  requireCompany,
  getProductVariantById
);

router.post(
  '/create/product-variant',
  verifyJWT,
  requireCompany,
  createProductVariant
);

router.put(
  '/update/product-variant/:id',
  verifyJWT,
  requireCompany,
  updateProductVariant
);

router.delete(
  '/delete/product-variant/:id',
  verifyJWT,
  requireCompany,
  deleteProductVariant
);

export default router;
