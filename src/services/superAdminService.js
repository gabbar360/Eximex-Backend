import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import bcrypt from 'bcryptjs';

export const superAdminService = {
  // Get all users
  async getAllUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        companyId: true,
        status: true,
        isBlocked: true,
        createdAt: true,
        role: true,
        company: true
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Get user by ID
  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        roleId: true,
        companyId: true,
        status: true,
        isBlocked: true,
        createdAt: true,
        role: true,
        company: true,
        userPermissions: {
          include: {
            menuItem: true
          }
        }
      }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  // Create user
  async createUser(data) {
    const { name, email, password, roleId, companyId } = data;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: parseInt(roleId),
        companyId: companyId ? parseInt(companyId) : null
      },
      include: {
        role: true,
        company: true
      }
    });
  },

  // Update user
  async updateUser(id, data) {
    const { name, email, password, roleId, companyId, status } = data;

    const updateData = {};
    
    // Only update fields that are provided
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (roleId !== undefined) updateData.roleId = parseInt(roleId);
    if (companyId !== undefined) updateData.companyId = companyId ? parseInt(companyId) : null;
    if (status !== undefined) updateData.status = status;

    // Hash password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    return await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        companyId: true,
        status: true,
        isBlocked: true,
        createdAt: true,
        role: true,
        company: true
      }
    });
  },

  // Delete user
  async deleteUser(id) {
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    return true;
  }
};