import { userPermissionService } from '../services/userPermissionService.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const permissions = await userPermissionService.getUserPermissions(
    parseInt(userId)
  );
  return res
    .status(200)
    .json(
      new ApiResponse(200, permissions, 'User permissions fetched successfully')
    );
});

export const setUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { permissions } = req.body;

  await userPermissionService.setUserPermissions(parseInt(userId), permissions);
  return res
    .status(200)
    .json(new ApiResponse(200, null, 'User permissions updated successfully'));
});

export const getUserSidebarMenu = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const menu = await userPermissionService.getUserSidebarMenu(userId);
  return res
    .status(200)
    .json(new ApiResponse(200, menu, 'User sidebar menu fetched successfully'));
});

export const getUserWithPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userWithPermissions =
    await userPermissionService.getUserWithPermissions(parseInt(userId));
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userWithPermissions,
        'User with permissions fetched successfully'
      )
    );
});

export const updateUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { permissions, submenuPermissions } = req.body;

  const updatedPermissions = await userPermissionService.updateUserPermissions(
    parseInt(userId),
    permissions,
    submenuPermissions
  );
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPermissions,
        'User permissions updated successfully'
      )
    );
});

export const deleteUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { menuItemIds } = req.body; // Optional: specific menu items to delete

  await userPermissionService.deleteUserPermissions(
    parseInt(userId),
    menuItemIds
  );
  return res
    .status(200)
    .json(new ApiResponse(200, null, 'User permissions deleted successfully'));
});

export const getAllUsersWithPermissions = asyncHandler(async (req, res) => {
  const usersWithPermissions =
    await userPermissionService.getAllUsersWithPermissions(req.query);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        usersWithPermissions,
        'All users with permissions fetched successfully'
      )
    );
});

export const bulkUpdateUserPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { enableAll } = req.body;

  const result = await userPermissionService.bulkUpdateUserPermissions(
    parseInt(userId),
    Boolean(enableAll)
  );

  return res.status(200).json(new ApiResponse(200, result, result.message));
});
