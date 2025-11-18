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
  // Menu operations
  async getAllMenus() {
    return await prisma.menu.findMany({
      where: { isActive: true },
      include: {
        submenus: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
  },

  async getMenuById(id) {
    return await prisma.menu.findUnique({
      where: { id },
      include: {
        submenus: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
  },

  async createMenu(data) {
    if (!data.slug && data.name) {
      data.slug = generateSlug(data.name);
    }
    return await prisma.menu.create({ data });
  },

  async updateMenu(id, data) {
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }
    return await prisma.menu.update({ where: { id }, data });
  },

  async deleteMenu(id) {
    return await prisma.menu.update({
      where: { id },
      data: { isActive: false }
    });
  },

  // Submenu operations
  async createSubmenu(menuId, data) {
    if (!data.slug && data.name) {
      data.slug = generateSlug(data.name);
    }
    return await prisma.submenu.create({
      data: { ...data, menuId }
    });
  },

  async updateSubmenu(id, data) {
    if (data.name && !data.slug) {
      data.slug = generateSlug(data.name);
    }
    return await prisma.submenu.update({ where: { id }, data });
  },

  async deleteSubmenu(id) {
    return await prisma.submenu.update({
      where: { id },
      data: { isActive: false }
    });
  },

  async getSubmenusByMenuId(menuId) {
    return await prisma.submenu.findMany({
      where: { menuId, isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
  }
};