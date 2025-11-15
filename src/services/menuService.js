import { prisma } from '../config/dbConfig.js';

// Generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

export const menuService = {
  async getAllMenuItems() {
    return await prisma.menuItem.findMany({
      where: { isActive: true },
      include: { children: true },
      orderBy: { sortOrder: 'asc' }
    });
  },

  async getMenuItemById(id) {
    return await prisma.menuItem.findUnique({
      where: { id },
      include: { children: true, parent: true }
    });
  },

  async createMenuItem(data) {
    // Auto-generate slug if not provided
    if (!data.slug && data.name) {
      data.slug = generateSlug(data.name);
    }
    
    return await prisma.menuItem.create({ data });
  },

  async updateMenuItem(id, data) {
    // Auto-generate slug if name is updated but slug is not provided
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }
    
    return await prisma.menuItem.update({
      where: { id },
      data
    });
  },

  async deleteMenuItem(id) {
    return await prisma.menuItem.update({
      where: { id },
      data: { isActive: false }
    });
  }
};