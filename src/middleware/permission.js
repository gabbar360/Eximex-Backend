import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Check user permission for specific menu item and action
export const checkPermission = (menuItemSlug, action) => {
  return asyncHandler(async (req, res, next) => {
    const userId = req.user.id;

    // Get menu item by slug
    const menuItem = await prisma.menuItem.findUnique({
      where: { slug: menuItemSlug }
    });

    if (!menuItem) {
      throw new ApiError(404, 'Menu item not found');
    }

    // Get user permission for this menu item
    const userPermission = await prisma.userPermission.findFirst({
      where: {
        userId: userId,
        menuItemId: menuItem.id
      }
    });

    if (!userPermission) {
      throw new ApiError(403, 'No permission found for this resource');
    }

    // Check specific action permission
    const hasPermission = userPermission[action];

    if (!hasPermission) {
      throw new ApiError(403, `You don't have ${action} permission for this resource`);
    }

    next();
  });
};

// Permission check helpers
export const canView = (menuItemSlug) => checkPermission(menuItemSlug, 'canView');
export const canCreate = (menuItemSlug) => checkPermission(menuItemSlug, 'canCreate');
export const canUpdate = (menuItemSlug) => checkPermission(menuItemSlug, 'canUpdate');
export const canDelete = (menuItemSlug) => checkPermission(menuItemSlug, 'canDelete');