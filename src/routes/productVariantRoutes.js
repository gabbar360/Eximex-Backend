import { Router } from 'express';
import {
  getAllProductVariants,
  getProductVariantById,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getProductVariantStats,
} from '../controller/productVariantController.js';
import { validate } from '../middleware/validate.js';
import { productVariantValidation } from '../validations/productVariant.validation.js';
import { verifyJWT, requireCompany } from '../middleware/auth.js';

const router = Router();

// ProductVariant routes
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
  validate(productVariantValidation.getProductVariant),
  getProductVariantById
);

router.post(
  '/create/product-variant',
  verifyJWT,
  requireCompany,
  validate(productVariantValidation.createProductVariant),
  createProductVariant
);

router.put(
  '/update/product-variant/:id',
  verifyJWT,
  requireCompany,
  validate(productVariantValidation.updateProductVariant),
  updateProductVariant
);

router.delete(
  '/delete/product-variant/:id',
  verifyJWT,
  requireCompany,
  validate(productVariantValidation.getProductVariant),
  deleteProductVariant
);

router.get(
  '/stats/product-variants',
  verifyJWT,
  requireCompany,
  getProductVariantStats
);

export default router;
