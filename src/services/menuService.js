import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';

const getAllMenus = async (options = {}) => {
    const { page = 1, limit = 10, search = '' } = options;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { path: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [menus, total] = await Promise.all([
      prisma.menu.findMany({
        where,
        include: {
          submenus: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.menu.count({ where }),
    ]);

    return {
      data: menus,
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

const getMenuById = async (id) => {
    const menu = await prisma.menu.findUnique({
      where: { id },
      include: {
        submenus: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!menu) {
      throw new ApiError(404, 'Menu not found');
    }

    return menu;
};

const createMenu = async (data) => {
    const { name, slug, path, icon, sortOrder } = data;

    // Check if slug exists
    const existingMenu = await prisma.menu.findUnique({
      where: { slug },
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
        sortOrder: sortOrder || 0,
      },
    });
};

const updateMenu = async (id, data) => {
    const { name, slug, path, icon, sortOrder, isActive } = data;

    const menu = await getMenuById(id);

    // Check if slug exists (excluding current menu)
    if (slug && slug !== menu.slug) {
      const existingMenu = await prisma.menu.findUnique({
        where: { slug },
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
        isActive,
      },
    });
};

const deleteMenu = async (id) => {
    const menu = await prisma.menu.findUnique({
      where: { id },
      include: {
        submenus: true,
        permissions: true,
      },
    });

    if (!menu) {
      throw new ApiError(404, 'Menu not found');
    }

    if (menu.submenus.length > 0) {
      throw new ApiError(
        400,
        'Cannot delete menu with submenus. Delete submenus first.'
      );
    }

    if (menu.permissions.length > 0) {
      throw new ApiError(400, 'Cannot delete menu with assigned permissions');
    }

    await prisma.menu.delete({
      where: { id },
    });

    return true;
};

const createSubmenu = async (data) => {
    const { menuId, name, slug, path, icon, sortOrder } = data;

    // Check if parent menu exists
    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
    });

    if (!menu) {
      throw new ApiError(404, 'Parent menu not found');
    }

    // Check if slug exists within the same menu
    const existingSubmenu = await prisma.submenu.findFirst({
      where: {
        menuId,
        slug,
      },
    });

    if (existingSubmenu) {
      throw new ApiError(
        400,
        'Submenu with this slug already exists in this menu'
      );
    }

    return await prisma.submenu.create({
      data: {
        menuId,
        name,
        slug,
        path,
        icon,
        sortOrder: sortOrder || 0,
      },
    });
};

const updateSubmenu = async (id, data) => {
    const { name, slug, path, icon, sortOrder, isActive } = data;

    const submenu = await prisma.submenu.findUnique({
      where: { id },
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
          id: { not: id },
        },
      });

      if (existingSubmenu) {
        throw new ApiError(
          400,
          'Submenu with this slug already exists in this menu'
        );
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
        isActive,
      },
    });
};

const deleteSubmenu = async (id) => {
    const submenu = await prisma.submenu.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });

    if (!submenu) {
      throw new ApiError(404, 'Submenu not found');
    }

    if (submenu.permissions.length > 0) {
      throw new ApiError(
        400,
        'Cannot delete submenu with assigned permissions'
      );
    }

    await prisma.submenu.delete({
      where: { id },
    });

    return true;
};

export const MenuService = {
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  createSubmenu,
  updateSubmenu,
  deleteSubmenu,
};
