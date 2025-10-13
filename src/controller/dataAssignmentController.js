import { asyncHandler } from '../utils/asyncHandler.js';
import { DataAssignmentService } from '../services/dataAssignmentService.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const assignData = asyncHandler(async (req, res) => {
  const { entityType, entityIds, fromUserId, toUserId } = req.body;

  const result = await DataAssignmentService.assignDataToStaff(
    entityType,
    entityIds,
    fromUserId,
    toUserId,
    req.user.companyId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Data assigned successfully'));
});

export const getAssignableData = asyncHandler(async (req, res) => {
  const { userId, entityType } = req.params;

  const data = await DataAssignmentService.getAssignableData(
    parseInt(userId),
    req.user.companyId,
    entityType
  );

  return res
    .status(200)
    .json(new ApiResponse(200, data, 'Assignable data fetched successfully'));
});
