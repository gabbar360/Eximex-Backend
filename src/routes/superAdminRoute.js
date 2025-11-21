import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  setInvitedUserPassword,
  validateInvitationToken
} from '../controller/superAdminController.js';

const router = Router();

// Protected super admin routes
router.get('/super-admin/get-users', verifyJWT, getAllUsers);
router.get('/super-admin/get-users/:id', verifyJWT, getUserById);
router.post('/super-admin/create-users', verifyJWT, createUser);
router.put('/super-admin/update-users/:id', verifyJWT, updateUser);
router.delete('/super-admin/delete-users/:id', verifyJWT, deleteUser);

export default router;