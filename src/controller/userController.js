import { asyncHandler } from '../utils/asyncHandler.js';
import { UserService } from '../services/userService.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await UserService.getAllUsers(req.query, req.user);

  return res
    .status(200)
    .json(new ApiResponse(200, users, 'Users fetched successfully'));
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await UserService.getUserById(parseInt(req.params.id));

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'User fetched successfully'));
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await UserService.createUser(req.body, req.user);

  return res
    .status(201)
    .json(new ApiResponse(201, user, 'User created successfully'));
});

export const updateUser = asyncHandler(async (req, res) => {
  const updated = await UserService.updateUser(
    parseInt(req.params.id),
    req.body,
    req.user
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updated, 'User updated successfully........'));
});

export const deleteUser = asyncHandler(async (req, res) => {
  const result = await UserService.deleteUser(parseInt(req.params.id));

  return res.status(200).json(new ApiResponse(200, null, result.message));
});

export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await UserService.getUserStats(req.user.companyId);

  return res
    .status(200)
    .json(new ApiResponse(200, stats, 'User stats fetched successfully'));
});

export const changeUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const result = await UserService.changePassword(
    parseInt(req.params.id),
    oldPassword,
    newPassword
  );

  return res.status(200).json(new ApiResponse(200, null, result.message));
});

// Staff management endpoints
export const getCompanyStaff = asyncHandler(async (req, res) => {
  const staff = await UserService.getCompanyStaff(
    req.user.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, staff, 'Company staff fetched successfully'));
});

export const getUserDataSummary = asyncHandler(async (req, res) => {
  const requestedUserId = parseInt(req.params.id);

  // Staff can only access their own data summary
  if (req.user.role === 'STAFF' && req.user.id !== requestedUserId) {
    throw new ApiError(403, 'Access denied');
  }

  const summary = await UserService.getUserDataSummary(
    requestedUserId,
    req.user.companyId
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, summary, 'User data summary fetched successfully')
    );
});

export const reassignUserData = asyncHandler(async (req, res) => {
  const { fromUserId, toUserId } = req.body;

  const result = await UserService.reassignUserData(
    fromUserId,
    toUserId,
    req.user.companyId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, result, 'User data reassigned successfully'));
});

export const deleteStaffAndReassign = asyncHandler(async (req, res) => {
  const { reassignToUserId } = req.body;

  const result = await UserService.deleteStaffAndReassign(
    parseInt(req.params.id),
    reassignToUserId,
    req.user.companyId
  );

  return res.status(200).json(new ApiResponse(200, null, result.message));
});

export const getCompanyDashboardStats = asyncHandler(async (req, res) => {
  const stats = await UserService.getCompanyDashboardStats(req.user.companyId);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        stats,
        'Company dashboard stats fetched successfully'
      )
    );
});

// Super Admin functions
export const getAllUsersForSuperAdmin = asyncHandler(async (req, res) => {
  const users = await UserService.getAllUsersForSuperAdmin(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, users, 'All users fetched successfully'));
});

export const toggleUserBlock = asyncHandler(async (req, res) => {
  const result = await UserService.toggleUserBlock(parseInt(req.params.id));

  return res.status(200).json(new ApiResponse(200, result, result.message));
});

export const getSuperAdminDashboardStats = asyncHandler(async (req, res) => {
  const stats = await UserService.getSuperAdminDashboardStats();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        stats,
        'Super admin dashboard stats fetched successfully'
      )
    );
});

// Enhanced Super Admin functions for complete database access
export const getAllDatabaseData = asyncHandler(async (req, res) => {
  const data = await UserService.getAllDatabaseData(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, data, 'Database data fetched successfully'));
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const result = await UserService.resetUserPassword(
    parseInt(req.params.id),
    newPassword
  );

  return res.status(200).json(new ApiResponse(200, null, result.message));
});

export const getAllCompanies = asyncHandler(async (req, res) => {
  const companies = await UserService.getAllCompanies(req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, companies, 'Companies fetched successfully'));
});

export const getCompanyDetails = asyncHandler(async (req, res) => {
  const company = await UserService.getCompanyDetails(parseInt(req.params.id));

  return res
    .status(200)
    .json(
      new ApiResponse(200, company, 'Company details fetched successfully')
    );
});

export const getAllTables = asyncHandler(async (req, res) => {
  const tables = await UserService.getAllTables();

  return res
    .status(200)
    .json(new ApiResponse(200, tables, 'Database tables fetched successfully'));
});

export const deleteSuperAdminUser = asyncHandler(async (req, res) => {
  const result = await UserService.deleteSuperAdminUser(parseInt(req.params.id));

  return res.status(200).json(new ApiResponse(200, null, result.message));
});

export const getTableData = asyncHandler(async (req, res) => {
  const data = await UserService.getTableData(req.params.tableName, req.query);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        data,
        `${req.params.tableName} data fetched successfully`
      )
    );
});
