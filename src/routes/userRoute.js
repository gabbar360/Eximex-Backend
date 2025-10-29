import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  changeUserPassword,
  getCompanyStaff,
  getUserDataSummary,
  reassignUserData,
  deleteStaffAndReassign,
  getCompanyDashboardStats,
  getAllUsersForSuperAdmin,
  toggleUserBlock,
  getSuperAdminDashboardStats,
  getAllDatabaseData,
  resetUserPassword,
  getAllCompanies,
  getCompanyDetails,
  getAllTables,
  getTableData,
} from '../controller/userController.js';
import { validate } from '../middleware/validate.js';
import { userValidation } from '../validations/user.validation.js';
import {
  verifyJWT,
  authorizeRoles,
  requireCompany,
  scopeToCompany,
  validateStaffManagement,
  checkDataOwnership,
} from '../middleware/auth.js';
import { ActivityLogService } from '../services/activityLogService.js';

const router = Router();

// User CRUD routes
router.get(
  '/users',
  verifyJWT,
  requireCompany,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  ActivityLogService.createActivityLogger('User'),
  getAllUsers
);

router.get(
  '/users/stats',
  verifyJWT,
  requireCompany,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  getUserStats
);

router.get(
  '/dashboard/stats',
  verifyJWT,
  requireCompany,
  getCompanyDashboardStats
);

router.get(
  '/users/:id',
  verifyJWT,
  requireCompany,
  validate(userValidation.getUser),
  getUserById
);

router.post(
  '/users',
  verifyJWT,
  requireCompany,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validate(userValidation.createUser),
  ActivityLogService.createActivityLogger('User'),
  createUser
);

router.put(
  '/users/:id',
  verifyJWT,
  requireCompany,
  // validateStaffManagement,
  validate(userValidation.updateUser),
  ActivityLogService.createActivityLogger('User'),
  updateUser
);

router.delete(
  '/users/:id',
  verifyJWT,
  requireCompany,
  validateStaffManagement,
  validate(userValidation.getUser),
  ActivityLogService.createActivityLogger('User'),
  deleteUser
);

router.patch(
  '/users/:id/password',
  verifyJWT,
  requireCompany,
  validate(userValidation.changePassword),
  changeUserPassword
);

// Staff management routes
router.get(
  '/staff',
  verifyJWT,
  requireCompany,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  getCompanyStaff
);

router.get(
  '/users/:id/data-summary',
  verifyJWT,
  requireCompany,
  validate(userValidation.getUser),
  getUserDataSummary
);

router.post(
  '/users/reassign-data',
  verifyJWT,
  requireCompany,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validate(userValidation.reassignData),
  ActivityLogService.createActivityLogger('UserDataReassignment'),
  reassignUserData
);

router.delete(
  '/users/:id/delete-and-reassign',
  verifyJWT,
  requireCompany,
  validateStaffManagement,
  validate(userValidation.deleteAndReassign),
  ActivityLogService.createActivityLogger('User'),
  deleteStaffAndReassign
);

// Super Admin routes
router.get(
  '/super-admin/users',
  verifyJWT,
  authorizeRoles('SUPER_ADMIN'),
  getAllUsersForSuperAdmin
);

router.patch(
  '/super-admin/users/:id/block',
  verifyJWT,
  authorizeRoles('SUPER_ADMIN'),
  validate(userValidation.getUser),
  ActivityLogService.createActivityLogger('User'),
  toggleUserBlock
);

router.get(
  '/super-admin/dashboard/stats',
  verifyJWT,
  authorizeRoles('SUPER_ADMIN'),
  getSuperAdminDashboardStats
);

// Enhanced Super Admin routes for complete database access
router.get(
  '/super-admin/database/all-data',
  verifyJWT,
  authorizeRoles('SUPER_ADMIN'),
  getAllDatabaseData
);

router.patch(
  '/super-admin/users/:id/reset-password',
  verifyJWT,
  authorizeRoles('SUPER_ADMIN'),
  validate(userValidation.resetPassword),
  ActivityLogService.createActivityLogger('User'),
  resetUserPassword
);

router.get(
  '/super-admin/companies',
  verifyJWT,
  authorizeRoles('SUPER_ADMIN'),
  getAllCompanies
);

router.get(
  '/super-admin/companies/:id',
  verifyJWT,
  authorizeRoles('SUPER_ADMIN'),
  getCompanyDetails
);

router.get(
  '/super-admin/database/tables',
  verifyJWT,
  authorizeRoles('SUPER_ADMIN'),
  getAllTables
);

router.get(
  '/super-admin/database/tables/:tableName',
  verifyJWT,
  authorizeRoles('SUPER_ADMIN'),
  getTableData
);

export default router;
