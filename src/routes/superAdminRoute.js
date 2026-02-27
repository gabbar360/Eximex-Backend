import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { uploadLogoAndSignature, handleMulterError } from '../config/multer.js';
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
  getCompanyData,
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
router.post(
  '/super-admin/create-company',
  verifyJWT,
  uploadLogoAndSignature,
  handleMulterError,
  createCompany
);
// Handle both JSON and multipart requests
router.put(
  '/super-admin/companies/:id',
  verifyJWT,
  (req, res, next) => {
    // Check if request has files
    const contentType = req.get('Content-Type');
    if (contentType && contentType.includes('multipart/form-data')) {
      // Use multer for multipart requests
      uploadLogoAndSignature(req, res, next);
    } else {
      // Skip multer for JSON requests
      next();
    }
  },
  handleMulterError,
  updateCompany
);
router.delete('/super-admin/companies/:id', verifyJWT, deleteCompany);
router.get('/super-admin/companies/:id/data', verifyJWT, getCompanyData);

export default router;
