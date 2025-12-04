import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  bulkUploadProducts,
  downloadTemplate,
} from '../controller/productController.js';
import { validate } from '../middleware/validate.js';
import { productValidation } from '../validations/product.validation.js';
import { verifyJWT, requireCompany, filterByRole } from '../middleware/auth.js';
import { uploadExcel, handleMulterError } from '../config/multer.js';

const router = Router();

// Product routes
router.get(
  '/get-all/products',
  verifyJWT,
  requireCompany,
  filterByRole,
  getAllProducts
);

router.get(
  '/get/product/:id',
  verifyJWT,
  requireCompany,
  validate(productValidation.getProduct),
  getProductById
);

router.post(
  '/create/product',
  verifyJWT,
  requireCompany,
  validate(productValidation.createProduct),
  createProduct
);

router.put(
  '/update/product/:id',
  verifyJWT,
  requireCompany,
  validate(productValidation.updateProduct),
  updateProduct
);

router.delete(
  '/delete/product/:id',
  verifyJWT,
  requireCompany,
  validate(productValidation.getProduct),
  deleteProduct
);

router.get('/stats/products', verifyJWT, requireCompany, getProductStats);

// Bulk Upload routes
router.post(
  '/bulk-upload/products',
  verifyJWT,
  requireCompany,
  uploadExcel,
  handleMulterError,
  bulkUploadProducts
);

router.get('/download/template', verifyJWT, requireCompany, downloadTemplate);

export default router;
