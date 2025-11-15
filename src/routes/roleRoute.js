import { Router } from 'express';
import { verifyJWT, authorizeRoles } from '../middleware/auth.js';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} from '../controller/roleController.js';

const router = Router();

// Get all roles (authenticated users)
router.get('/getroles', verifyJWT, getAllRoles);

// Get role by ID (authenticated users)
router.get('/getroles/:id', verifyJWT, getRoleById);

// Create role (Super Admin only)
router.post('/create-role', verifyJWT, authorizeRoles('SUPER_ADMIN'), createRole);

// Update role (Super Admin only)
router.put('/update-roles/:id', verifyJWT, authorizeRoles('SUPER_ADMIN'), updateRole);

// Delete role (Super Admin only)
router.delete('/delete-roles/:id', verifyJWT, authorizeRoles('SUPER_ADMIN'), deleteRole);

export default router;