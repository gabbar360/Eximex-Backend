import { Router } from 'express';
import {
  assignData,
  getAssignableData,
} from '../controller/dataAssignmentController.js';
import {
  verifyJWT,
  authorizeRoles,
  requireCompany,
} from '../middleware/auth.js';
import { ActivityLogService } from '../services/activityLogService.js';
import { trackActivity } from '../middleware/activityTracker.js';

const router = Router();

// Assign data from one staff to another
router.post(
  '/assign-data',
  verifyJWT,
  requireCompany,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  ActivityLogService.createActivityLogger('DataAssignment'),
  trackActivity('DataAssignment', 'CREATE'),
  assignData
);

// Get assignable data for a user
router.get(
  '/assignable-data/:userId/:entityType',
  verifyJWT,
  requireCompany,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  getAssignableData
);

export default router;
