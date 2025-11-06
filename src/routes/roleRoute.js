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
router.post('/roles', verifyJWT, authorizeRoles('SUPER_ADMIN'), createRole);

// Update role (Super Admin only)
router.put('/roles/:id', verifyJWT, authorizeRoles('SUPER_ADMIN'), updateRole);

// Delete role (Super Admin only)
router.delete('/roles/:id', verifyJWT, authorizeRoles('SUPER_ADMIN'), deleteRole);

export default router;