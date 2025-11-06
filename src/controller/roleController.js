import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Get all roles
export const getAllRoles = asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });

  return res.status(200).json(
    new ApiResponse(200, roles, 'Roles fetched successfully')
  );
});

// Create new role (Super Admin only)
export const createRole = asyncHandler(async (req, res) => {
  const { name, displayName, description, permissions } = req.body;

  // Convert name to uppercase with underscores
  const formattedName = name
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();

  // Check if role already exists
  const existingRole = await prisma.role.findUnique({
    where: { name: formattedName }
  });

  if (existingRole) {
    throw new ApiError(400, 'Role with this name already exists');
  }

  const role = await prisma.role.create({
    data: {
      name: formattedName,
      displayName,
      description,
      permissions,
      isSystem: false
    }
  });

  return res.status(201).json(
    new ApiResponse(201, role, 'Role created successfully')
  );
});

// Update role (Super Admin only)
export const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, displayName, description, permissions } = req.body;

  const role = await prisma.role.findUnique({
    where: { id: parseInt(id) }
  });

  if (!role) {
    throw new ApiError(404, 'Role not found');
  }

  if (role.isSystem) {
    throw new ApiError(400, 'System roles cannot be modified');
  }

  // Prepare update data
  const updateData = {
    displayName,
    description,
    permissions
  };

  // If name is provided, format and check for uniqueness
  if (name && name !== role.name) {
    const formattedName = name
      .trim()
      .replace(/\s+/g, '_')
      .toUpperCase();

    // Check if new name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: formattedName }
    });

    if (existingRole && existingRole.id !== parseInt(id)) {
      throw new ApiError(400, 'Role with this name already exists');
    }

    updateData.name = formattedName;
  }

  const updatedRole = await prisma.role.update({
    where: { id: parseInt(id) },
    data: updateData
  });

  return res.status(200).json(
    new ApiResponse(200, updatedRole, 'Role updated successfully')
  );
});

// Delete role (Super Admin only)
export const deleteRole = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await prisma.role.findUnique({
    where: { id: parseInt(id) },
    include: { users: true }
  });

  if (!role) {
    throw new ApiError(404, 'Role not found');
  }

  if (role.isSystem) {
    throw new ApiError(400, 'System roles cannot be deleted');
  }

  if (role.users.length > 0) {
    throw new ApiError(400, 'Cannot delete role that is assigned to users');
  }

  await prisma.role.delete({
    where: { id: parseInt(id) }
  });

  return res.status(200).json(
    new ApiResponse(200, null, 'Role deleted successfully')
  );
});