import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';

export const roleService = {
  // Get all roles
  async getAllRoles() {
    return await prisma.role.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  // Get role by ID
  async getRoleById(id) {
    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
    });

    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    return role;
  },

  // Create new role
  async createRole(data) {
    const { name, displayName, description } = data;

    // Format name
    const formattedName = name.trim().replace(/\s+/g, '_').toUpperCase();

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { name: formattedName },
    });

    if (existingRole) {
      throw new ApiError(400, 'Role with this name already exists');
    }

    return await prisma.role.create({
      data: {
        name: formattedName,
        displayName,
        description,
        isSystem: false,
      },
    });
  },

  // Update role
  async updateRole(id, data) {
    const { name, displayName, description } = data;

    const role = await this.getRoleById(id);

    if (role.isSystem) {
      throw new ApiError(400, 'System roles cannot be modified');
    }

    const updateData = { displayName, description };

    // Handle name update
    if (name && name !== role.name) {
      const formattedName = name.trim().replace(/\s+/g, '_').toUpperCase();

      const existingRole = await prisma.role.findUnique({
        where: { name: formattedName },
      });

      if (existingRole && existingRole.id !== parseInt(id)) {
        throw new ApiError(400, 'Role with this name already exists');
      }

      updateData.name = formattedName;
    }

    return await prisma.role.update({
      where: { id: parseInt(id) },
      data: updateData,
    });
  },

  // Delete role
  async deleteRole(id) {
    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: { users: true },
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
      where: { id: parseInt(id) },
    });

    return true;
  },
};
