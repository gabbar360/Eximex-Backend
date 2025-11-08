import express from 'express';
const router = express.Router();
import {
  // New packing list CRUD functions
  getAllPackingLists,
  getPackingListById,
  createPackingList,
  updatePackingList,
  deletePackingList,
  downloadPackingListPDF,
} from '../controller/packagingStepsController.js';
import { verifyJWT } from '../middleware/auth.js';

/**
 * @route GET /api/v1/packing-lists
 * @desc Get all packing lists
 * @access Private
 */
router.get('/packing-lists', verifyJWT, getAllPackingLists);

/**
 * @route GET /api/v1/packing-lists/:id
 * @desc Get packing list by ID
 * @access Private
 */
router.get('/packing-lists/:id', verifyJWT, getPackingListById);

/**
 * @route POST /api/v1/packing-lists
 * @desc Create new packing list
 * @access Private
 */

/**
 * @route PUT /api/v1/packing-lists/:id
 * @desc Update packing list
 * @access Private
 */

/**
 * @route DELETE /api/v1/packing-lists/:id
 * @desc Delete packing list
 * @access Private
 */

/**
 * @route GET /api/v1/packing-lists/:id/pdf
 * @desc Download packing list PDF
 * @access Private
 */
router.get('/packing-lists/:id/pdf', verifyJWT, downloadPackingListPDF);

export default router;
