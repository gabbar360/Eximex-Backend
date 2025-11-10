import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.js';
import {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole
} from '../controller/roleController.js';

const router = Router();

// Get all roles (authenticated users)
router.get('/roles', verifyJWT, getAllRoles);

// Create role (Super Admin only)

// Update role (Super Admin only)

// Delete role (Super Admin only)

export default router;