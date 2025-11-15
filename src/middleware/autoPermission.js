import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Auto detect permission based on HTTP method and route
export const autoPermission = (menuSlug) => {
  return asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const method = req.method;

    // Map HTTP methods to permission actions
    const methodToPermission = {
      'GET': 'canView',
      'POST': 'canCreate', 
      'PUT': 'canUpdate',
      'PATCH': 'canUpdate',
      'DELETE': 'canDelete'
    };

    // Map permission to action names for error messages
    const permissionToAction = {
      'canView': 'view',
      'canCreate': 'create',
      'canUpdate': 'update', 
      'canDelete': 'delete'
    };

    const requiredPermission = methodToPermission[method];

    if (!requiredPermission) {
      return next(); // Skip permission check for unsupported methods
    }

    // Get menu item
    const menuItem = await prisma.menuItem.findUnique({
      where: { slug: menuSlug }
    });

    if (!menuItem) {
      throw new ApiError(404, 'Menu item not found');
    }

    // Get user permission
    const userPermission = await prisma.userPermission.findFirst({
      where: {
        userId: userId,
        menuItemId: menuItem.id
      }
    });

    if (!userPermission) {
      throw new ApiError(403, 'No permission found for this resource');
    }

    // Check permission
    if (!userPermission[requiredPermission]) {
      const actionName = permissionToAction[requiredPermission];
      throw new ApiError(403, `You don't have ${actionName} permission for this resource`);
    }

    next();
  });
};