import express from 'express';
const router = express.Router();
import {
  createPackagingHierarchy,
  getPackagingHierarchy,
  getFullPackagingStructure,
  convertUnits,
  getAllPackagingUnits,
  createPackagingUnits,
} from '../controller/packagingController.js';
import { verifyJWT } from '../middleware/auth.js';

/**
 * @route POST /api/v1/packaging/hierarchy
 * @desc Create or update packaging hierarchy for a category
 * @access Private
 */
router.post('/packaging/hierarchy', verifyJWT, createPackagingHierarchy);

/**
 * @route GET /api/v1/packaging/hierarchy/:categoryId
 * @desc Get packaging hierarchy for a category
 * @access Private
 */
router.get(
  '/packaging/hierarchy/:categoryId',
  verifyJWT,
  getPackagingHierarchy
);

/**
 * @route GET /api/v1/packaging/structure/:categoryId
 * @desc Get full packaging structure for a category
 * @access Private
 */
router.get(
  '/packaging/structure/:categoryId',
  verifyJWT,
  getFullPackagingStructure
);

/**
 * @route POST /api/v1/packaging/convert
 * @desc Convert units based on packaging hierarchy
 * @access Private
 */
router.post('/packaging/convert', verifyJWT, convertUnits);

/**
 * @route GET /api/v1/packaging/units
 * @desc Get all packaging units
 * @access Private
 */
// router.get('/packaging/units', verifyJWT, getAllPackagingUnits);
router.get('/packaging/units', getAllPackagingUnits);

/**
 * @route POST /api/v1/packaging/units/seed
 * @desc Create default packaging units (seed data)
 * @access Private
 */
// router.post('/packaging/units/seed', verifyJWT, createPackagingUnits);
router.post('/packaging/units/seed', createPackagingUnits);

export default router;
