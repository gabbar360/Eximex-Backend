import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  setInvitedUserPassword,
  validateInvitationToken,
  assignCompanyToUser,
  getAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../controller/superAdminController.js';

const router = Router();

// Protected super admin routes
router.get('/super-admin/get-users', verifyJWT, getAllUsers);
router.get('/super-admin/get-users/:id', verifyJWT, getUserById);
router.post('/super-admin/create-users', verifyJWT, createUser);
router.put('/super-admin/update-users/:id', verifyJWT, updateUser);
router.delete('/super-admin/delete-users/:id', verifyJWT, deleteUser);
router.post('/super-admin/assign-company', verifyJWT, assignCompanyToUser);
router.get('/super-admin/companies', verifyJWT, getAllCompanies);
router.post('/super-admin/create-company', verifyJWT, createCompany);
router.put('/super-admin/companies/:id', verifyJWT, updateCompany);
router.delete('/super-admin/companies/:id', verifyJWT, deleteCompany);

export default router;
