import { prisma } from '../config/dbConfig.js';

export const userPermissionService = {
  async getUserPermissions(userId) {
    return await prisma.userPermission.findMany({
      where: { userId },
      include: {
        menuItem: {
          include: { children: true }
        }
      }
    });
  },

  async setUserPermissions(userId, permissions) {
    await prisma.userPermission.deleteMany({
      where: { userId }
    });

    const permissionData = permissions.map(p => ({
      userId,
      menuItemId: p.menuItemId,
      canView: p.canView || false,
      canCreate: p.canCreate || false,
      canUpdate: p.canUpdate || false,
      canDelete: p.canDelete || false
    }));

    return await prisma.userPermission.createMany({
      data: permissionData
    });
  },

  async updateUserPermissions(userId, permissions) {
    const results = [];
    
    for (const permission of permissions) {
      const result = await prisma.userPermission.upsert({
        where: {
          userId_menuItemId: {
            userId: userId,
            menuItemId: permission.menuItemId
          }
        },
        update: {
          canView: permission.canView || false,
          canCreate: permission.canCreate || false,
          canUpdate: permission.canUpdate || false,
          canDelete: permission.canDelete || false
        },
        create: {
          userId,
          menuItemId: permission.menuItemId,
          canView: permission.canView || false,
          canCreate: permission.canCreate || false,
          canUpdate: permission.canUpdate || false,
          canDelete: permission.canDelete || false
        }
      });
      results.push(result);
    }
    
    return results;
  },

  async deleteUserPermissions(userId, menuItemIds = null) {
    const whereClause = { userId };
    
    if (menuItemIds && menuItemIds.length > 0) {
      whereClause.menuItemId = { in: menuItemIds };
    }
    
    return await prisma.userPermission.deleteMany({
      where: whereClause
    });
  },

  async getUserSidebarMenu(userId) {
    const permissions = await prisma.userPermission.findMany({
      where: { 
        userId,
        canView: true
      },
      include: {
        menuItem: {
          include: { 
            children: true
          }
        }
      }
    });

    // Filter active menu items and sort
    const activePermissions = permissions.filter(p => p.menuItem.isActive);
    
    return activePermissions.map(p => ({
      ...p.menuItem,
      children: p.menuItem.children.filter(child => child.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
      permissions: {
        canView: p.canView,
        canCreate: p.canCreate,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete
      }
    })).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getUserWithPermissions(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        userPermissions: {
          include: {
            menuItem: true
          }
        }
      }
    });

    const allMenuItems = await prisma.menuItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    const userPermissionsMap = {};
    user.userPermissions.forEach(p => {
      userPermissionsMap[p.menuItemId] = {
        canView: p.canView,
        canCreate: p.canCreate,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete
      };
    });

    const menuWithPermissions = allMenuItems.map(menu => ({
      ...menu,
      permissions: userPermissionsMap[menu.id] || {
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false
      }
    }));

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      menuPermissions: menuWithPermissions
    };
  }
};