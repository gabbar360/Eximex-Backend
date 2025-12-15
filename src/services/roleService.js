import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';

const getAllRoles = async (options = {}) => {
    const { page = 1, limit = 10, search = '' } = options;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.role.count({ where }),
    ]);

    return {
      data: roles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    };
};

const getRoleById = async (id) => {
    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
    });

    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    return role;
};

const createRole = async (data) => {
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
};

const updateRole = async (id, data) => {
    const { name, displayName, description } = data;

    const role = await getRoleById(id);

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
};

const deleteRole = async (id) => {
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
};

export const RoleService = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
