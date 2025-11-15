import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { roleService } from '../services/roleService.js';

// Get all roles
export const getAllRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.getAllRoles();

  return res.status(200).json(
    new ApiResponse(200, roles, 'Roles fetched successfully')
  );
});

// Get role by ID
export const getRoleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const role = await roleService.getRoleById(id);

  return res.status(200).json(
    new ApiResponse(200, role, 'Role fetched successfully')
  );
});

// Create new role (Super Admin only)
export const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(req.body);

  return res.status(201).json(
    new ApiResponse(201, role, 'Role created successfully')
  );
});

// Update role (Super Admin only)
export const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedRole = await roleService.updateRole(id, req.body);

  return res.status(200).json(
    new ApiResponse(200, updatedRole, 'Role updated successfully')
  );
});

// Delete role (Super Admin only)
export const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await roleService.deleteRole(id);

  return res.status(200).json(
    new ApiResponse(200, null, 'Role deleted successfully')
  );
});