import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';

export const menuService = {
  // Get all menus with submenus
  async getAllMenus() {
    return await prisma.menu.findMany({
      include: {
        submenus: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
  },

  // Get menu by ID
  async getMenuById(id) {
    const menu = await prisma.menu.findUnique({
      where: { id },
      include: {
        submenus: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!menu) {
      throw new ApiError(404, 'Menu not found');
    }

    return menu;
  },

  // Create new menu
  async createMenu(data) {
    const { name, slug, path, icon, sortOrder } = data;

    // Check if slug exists
    const existingMenu = await prisma.menu.findUnique({
      where: { slug }
    });

    if (existingMenu) {
      throw new ApiError(400, 'Menu with this slug already exists');
    }

    return await prisma.menu.create({
      data: {
        name,
        slug,
        path,
        icon,
        sortOrder: sortOrder || 0
      }
    });
  },

  // Update menu
  async updateMenu(id, data) {
    const { name, slug, path, icon, sortOrder, isActive } = data;

    const menu = await this.getMenuById(id);

    // Check if slug exists (excluding current menu)
    if (slug && slug !== menu.slug) {
      const existingMenu = await prisma.menu.findUnique({
        where: { slug }
      });

      if (existingMenu) {
        throw new ApiError(400, 'Menu with this slug already exists');
      }
    }

    return await prisma.menu.update({
      where: { id },
      data: {
        name,
        slug,
        path,
        icon,
        sortOrder,
        isActive
      }
    });
  },

  // Delete menu
  async deleteMenu(id) {
    const menu = await prisma.menu.findUnique({
      where: { id },
      include: {
        submenus: true,
        permissions: true
      }
    });

    if (!menu) {
      throw new ApiError(404, 'Menu not found');
    }

    if (menu.submenus.length > 0) {
      throw new ApiError(400, 'Cannot delete menu with submenus. Delete submenus first.');
    }

    if (menu.permissions.length > 0) {
      throw new ApiError(400, 'Cannot delete menu with assigned permissions');
    }

    await prisma.menu.delete({
      where: { id }
    });

    return true;
  },

  // Create submenu
  async createSubmenu(data) {
    const { menuId, name, slug, path, icon, sortOrder } = data;

    // Check if parent menu exists
    const menu = await prisma.menu.findUnique({
      where: { id: menuId }
    });

    if (!menu) {
      throw new ApiError(404, 'Parent menu not found');
    }

    // Check if slug exists within the same menu
    const existingSubmenu = await prisma.submenu.findFirst({
      where: {
        menuId,
        slug
      }
    });

    if (existingSubmenu) {
      throw new ApiError(400, 'Submenu with this slug already exists in this menu');
    }

    return await prisma.submenu.create({
      data: {
        menuId,
        name,
        slug,
        path,
        icon,
        sortOrder: sortOrder || 0
      }
    });
  },

  // Update submenu
  async updateSubmenu(id, data) {
    const { name, slug, path, icon, sortOrder, isActive } = data;

    const submenu = await prisma.submenu.findUnique({
      where: { id }
    });

    if (!submenu) {
      throw new ApiError(404, 'Submenu not found');
    }

    // Check if slug exists within the same menu (excluding current submenu)
    if (slug && slug !== submenu.slug) {
      const existingSubmenu = await prisma.submenu.findFirst({
        where: {
          menuId: submenu.menuId,
          slug,
          id: { not: id }
        }
      });

      if (existingSubmenu) {
        throw new ApiError(400, 'Submenu with this slug already exists in this menu');
      }
    }

    return await prisma.submenu.update({
      where: { id },
      data: {
        name,
        slug,
        path,
        icon,
        sortOrder,
        isActive
      }
    });
  },

  // Delete submenu
  async deleteSubmenu(id) {
    const submenu = await prisma.submenu.findUnique({
      where: { id },
      include: {
        permissions: true
      }
    });

    if (!submenu) {
      throw new ApiError(404, 'Submenu not found');
    }

    if (submenu.permissions.length > 0) {
      throw new ApiError(400, 'Cannot delete submenu with assigned permissions');
    }

    await prisma.submenu.delete({
      where: { id }
    });

    return true;
  }
};