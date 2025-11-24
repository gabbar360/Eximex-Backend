import { prisma } from '../config/dbConfig.js';

export const userPermissionService = {
  async getUserPermissions(userId) {
    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        userPermissions: {
          include: {
            menu: true,
            submenu: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get all menus with submenus
    const allMenus = await prisma.menu.findMany({
      where: { isActive: true },
      include: {
        submenus: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Build response
    const response = {
      userId: user.id,
      userInfo: {
        name: user.name,
        email: user.email,
        roleName: user.role?.name || null,
      },
      menus: allMenus.map((menu) => {
        // Find menu permission
        const menuPermission = user.userPermissions.find(
          (p) => p.menuId === menu.id
        );

        return {
          menuId: menu.id,
          menuName: menu.name,
          menuSlug: menu.slug,
          permissions: {
            canView: menuPermission?.canView || false,
            canCreate: menuPermission?.canCreate || false,
            canUpdate: menuPermission?.canUpdate || false,
            canDelete: menuPermission?.canDelete || false,
          },
          submenus: menu.submenus.map((submenu) => {
            // Find submenu permission
            const submenuPermission = user.userPermissions.find(
              (p) => p.submenuId === submenu.id
            );

            return {
              submenuId: submenu.id,
              submenuName: submenu.name,
              submenuSlug: submenu.slug,
              permissions: {
                canView: submenuPermission?.canView || false,
                canCreate: submenuPermission?.canCreate || false,
                canUpdate: submenuPermission?.canUpdate || false,
                canDelete: submenuPermission?.canDelete || false,
              },
            };
          }),
        };
      }),
    };

    return response;
  },

  async setUserPermissions(userId, permissions) {
    // Delete existing permissions
    await prisma.userPermission.deleteMany({
      where: { userId },
    });

    if (!permissions || !Array.isArray(permissions)) {
      throw new Error('Permissions must be an array');
    }

    const permissionData = [];

    permissions.forEach((p) => {
      // Menu permission
      if (p.menuId) {
        permissionData.push({
          userId,
          menuId: p.menuId,
          submenuId: null,
          canView: p.canView || false,
          canCreate: p.canCreate || false,
          canUpdate: p.canUpdate || false,
          canDelete: p.canDelete || false,
        });
      }

      // Submenu permission
      if (p.submenuId) {
        permissionData.push({
          userId,
          menuId: null,
          submenuId: p.submenuId,
          canView: p.canView || false,
          canCreate: p.canCreate || false,
          canUpdate: p.canUpdate || false,
          canDelete: p.canDelete || false,
        });
      }
    });

    if (permissionData.length > 0) {
      return await prisma.userPermission.createMany({
        data: permissionData,
      });
    }

    return { count: 0 };
  },

  async updateUserPermissions(userId, permissions, submenuPermissions) {
    // First, delete all existing permissions for this user
    await prisma.userPermission.deleteMany({
      where: { userId },
    });

    const results = [];

    // Handle menu permissions
    if (permissions && Array.isArray(permissions)) {
      for (const p of permissions) {
        if (p.menuId) {
          const result = await prisma.userPermission.create({
            data: {
              userId,
              menuId: p.menuId,
              submenuId: null,
              canView: Boolean(p.canView),
              canCreate: Boolean(p.canCreate),
              canUpdate: Boolean(p.canUpdate),
              canDelete: Boolean(p.canDelete),
            },
          });
          results.push(result);
        }
      }
    }

    // Handle submenu permissions
    if (submenuPermissions && Array.isArray(submenuPermissions)) {
      for (const p of submenuPermissions) {
        if (p.submenuId) {
          const result = await prisma.userPermission.create({
            data: {
              userId,
              menuId: null,
              submenuId: p.submenuId,
              canView: Boolean(p.canView),
              canCreate: Boolean(p.canCreate),
              canUpdate: Boolean(p.canUpdate),
              canDelete: Boolean(p.canDelete),
            },
          });
          results.push(result);
        }
      }
    }

    return results;
  },

  async deleteUserPermissions(userId, menuItemIds = null) {
    const whereClause = { userId };

    if (menuItemIds && menuItemIds.length > 0) {
      whereClause.menuItemId = { in: menuItemIds };
    }

    return await prisma.userPermission.deleteMany({
      where: whereClause,
    });
  },

  async getUserSidebarMenu(userId) {
    // Get all user permissions
    const permissions = await prisma.userPermission.findMany({
      where: { userId },
      include: {
        menu: true,
        submenu: {
          include: {
            menu: true,
          },
        },
      },
    });

    const menuMap = new Map();
    const menuPermissions = new Map();

    // First, collect all menu permissions
    permissions.forEach((permission) => {
      if (permission.menuId) {
        menuPermissions.set(permission.menuId, permission.canView);
      }
    });

    // Process menu permissions - only show menus with canView: true
    permissions.forEach((permission) => {
      if (
        permission.menuId &&
        permission.menu &&
        permission.menu.isActive &&
        permission.canView
      ) {
        const menuId = permission.menu.id;
        if (!menuMap.has(menuId)) {
          menuMap.set(menuId, {
            id: permission.menu.id,
            name: permission.menu.name,
            slug: permission.menu.slug,
            path: permission.menu.path,
            icon: permission.menu.icon,
            sortOrder: permission.menu.sortOrder,
            isActive: permission.menu.isActive,
            submenus: [],
          });
        }
      }
    });

    // Process submenu permissions - only add if parent menu has canView: true
    permissions.forEach((permission) => {
      if (
        permission.submenuId &&
        permission.submenu &&
        permission.submenu.isActive &&
        permission.canView
      ) {
        const parentMenuId = permission.submenu.menuId;

        // Only add submenu if parent menu has canView: true
        const parentMenuCanView = menuPermissions.get(parentMenuId);
        if (!parentMenuCanView) {
          return;
        }

        // Ensure parent menu exists in map
        if (!menuMap.has(parentMenuId)) {
          const parentMenu = permission.submenu.menu;
          if (parentMenu && parentMenu.isActive) {
            menuMap.set(parentMenuId, {
              id: parentMenu.id,
              name: parentMenu.name,
              slug: parentMenu.slug,
              path: parentMenu.path,
              icon: parentMenu.icon,
              sortOrder: parentMenu.sortOrder,
              isActive: parentMenu.isActive,
              submenus: [],
            });
          }
        }

        // Add submenu to parent
        const parentMenu = menuMap.get(parentMenuId);
        if (
          parentMenu &&
          !parentMenu.submenus.find((s) => s.id === permission.submenu.id)
        ) {
          parentMenu.submenus.push({
            id: permission.submenu.id,
            name: permission.submenu.name,
            slug: permission.submenu.slug,
            path: permission.submenu.path,
            icon: permission.submenu.icon,
            sortOrder: permission.submenu.sortOrder,
            isActive: permission.submenu.isActive,
          });
        }
      }
    });

    // Convert to array and sort
    const result = Array.from(menuMap.values())
      .map((menu) => ({
        ...menu,
        submenus: menu.submenus.sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return result;
  },

  async getUserWithPermissions(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        userPermissions: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    const allMenuItems = await prisma.menuItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const userPermissionsMap = {};
    user.userPermissions.forEach((p) => {
      userPermissionsMap[p.menuItemId] = {
        canView: p.canView,
        canCreate: p.canCreate,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete,
      };
    });

    const menuWithPermissions = allMenuItems.map((menu) => ({
      ...menu,
      permissions: userPermissionsMap[menu.id] || {
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      },
    }));

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      menuPermissions: menuWithPermissions,
    };
  },

  async getAllUsersWithPermissions() {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        userPermissions: {
          include: {
            menu: true,
            submenu: true,
          },
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.userPermissions.map((p) => ({
        menuId: p.menuId,
        submenuId: p.submenuId,
        menuName: p.menu?.name,
        submenuName: p.submenu?.name,
        canView: p.canView,
        canCreate: p.canCreate,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete,
      })),
    }));
  },
};
