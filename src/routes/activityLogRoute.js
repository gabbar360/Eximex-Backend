import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ActivityLogService } from '../services/activityLogService.js';
import {
  verifyJWT,
  authorizeRoles,
  requireCompany,
} from '../middleware/auth.js';

const router = Router();

// Get activity logs for the company
router.get(
  '/activity-logs',
  verifyJWT,
  requireCompany,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const logs = await ActivityLogService.getActivityLogs(
      req.user.companyId,
      req.query
    );

    return res
      .status(200)
      .json(new ApiResponse(200, logs, 'Activity logs fetched successfully'));
  })
);

// Get activity stats for a user or company
router.get(
  '/activity-logs/stats',
  verifyJWT,
  requireCompany,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const { userId } = req.query;
    const stats = await ActivityLogService.getUserActivityStats(
      req.user.companyId,
      userId
    );

    return res
      .status(200)
      .json(new ApiResponse(200, stats, 'Activity stats fetched successfully'));
  })
);

export default router;
