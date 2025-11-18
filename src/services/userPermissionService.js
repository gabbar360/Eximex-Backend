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
            submenu: true
          }
        }
      }
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
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    // Build response
    const response = {
      userId: user.id,
      userInfo: {
        name: user.name,
        email: user.email,
        roleName: user.role?.name || null
      },
      menus: allMenus.map(menu => {
        // Find menu permission
        const menuPermission = user.userPermissions.find(p => p.menuId === menu.id);
        
        return {
          menuId: menu.id,
          menuName: menu.name,
          menuSlug: menu.slug,
          permissions: {
            canView: menuPermission?.canView || false,
            canCreate: menuPermission?.canCreate || false,
            canUpdate: menuPermission?.canUpdate || false,
            canDelete: menuPermission?.canDelete || false
          },
          submenus: menu.submenus.map(submenu => {
            // Find submenu permission
            const submenuPermission = user.userPermissions.find(p => p.submenuId === submenu.id);
            
            return {
              submenuId: submenu.id,
              submenuName: submenu.name,
              submenuSlug: submenu.slug,
              permissions: {
                canView: submenuPermission?.canView || false,
                canCreate: submenuPermission?.canCreate || false,
                canUpdate: submenuPermission?.canUpdate || false,
                canDelete: submenuPermission?.canDelete || false
              }
            };
          })
        };
      })
    };

    return response;
  },

  async setUserPermissions(userId, permissions) {
    // Delete existing permissions
    await prisma.userPermission.deleteMany({
      where: { userId }
    });

    if (!permissions || !Array.isArray(permissions)) {
      throw new Error('Permissions must be an array');
    }

    const permissionData = [];
    
    permissions.forEach(p => {
      // Menu permission
      if (p.menuId) {
        permissionData.push({
          userId,
          menuId: p.menuId,
          submenuId: null,
          canView: p.canView || false,
          canCreate: p.canCreate || false,
          canUpdate: p.canUpdate || false,
          canDelete: p.canDelete || false
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
          canDelete: p.canDelete || false
        });
      }
    });

    if (permissionData.length > 0) {
      return await prisma.userPermission.createMany({
        data: permissionData
      });
    }
    
    return { count: 0 };
  },

  async updateUserPermissions(userId, permissions, submenuPermissions) {
    const results = [];
    
    // Handle menu permissions
    if (permissions && Array.isArray(permissions)) {
      for (const p of permissions) {
        if (p.menuId) {
          // Find existing permission
          const existing = await prisma.userPermission.findFirst({
            where: {
              userId,
              menuId: p.menuId,
              submenuId: null
            }
          });
          
          if (existing) {
            // Update existing
            const result = await prisma.userPermission.update({
              where: { id: existing.id },
              data: {
                canView: p.canView || false,
                canCreate: p.canCreate || false,
                canUpdate: p.canUpdate || false,
                canDelete: p.canDelete || false
              }
            });
            results.push(result);
          } else {
            // Create new
            const result = await prisma.userPermission.create({
              data: {
                userId,
                menuId: p.menuId,
                submenuId: null,
                canView: p.canView || false,
                canCreate: p.canCreate || false,
                canUpdate: p.canUpdate || false,
                canDelete: p.canDelete || false
              }
            });
            results.push(result);
          }
        }
      }
    }
    
    // Handle submenu permissions
    if (submenuPermissions && Array.isArray(submenuPermissions)) {
      for (const p of submenuPermissions) {
        if (p.submenuId) {
          // Find existing permission
          const existing = await prisma.userPermission.findFirst({
            where: {
              userId,
              menuId: null,
              submenuId: p.submenuId
            }
          });
          
          if (existing) {
            // Update existing
            const result = await prisma.userPermission.update({
              where: { id: existing.id },
              data: {
                canView: p.canView || false,
                canCreate: p.canCreate || false,
                canUpdate: p.canUpdate || false,
                canDelete: p.canDelete || false
              }
            });
            results.push(result);
          } else {
            // Create new
            const result = await prisma.userPermission.create({
              data: {
                userId,
                menuId: null,
                submenuId: p.submenuId,
                canView: p.canView || false,
                canCreate: p.canCreate || false,
                canUpdate: p.canUpdate || false,
                canDelete: p.canDelete || false
              }
            });
            results.push(result);
          }
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
  },

  async getAllUsersWithPermissions() {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        userPermissions: {
          include: {
            menu: true,
            submenu: true
          }
        }
      }
    });

    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.userPermissions.map(p => ({
        menuId: p.menuId,
        submenuId: p.submenuId,
        menuName: p.menu?.name,
        submenuName: p.submenu?.name,
        canView: p.canView,
        canCreate: p.canCreate,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete
      }))
    }));
  }
};