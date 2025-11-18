import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Smart permission middleware - auto detects menu and action
export const smartPermission = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const method = req.method;
  const path = req.path;

  // Skip for auth and admin routes
  if (path.includes('/auth/') || path.includes('/super-admin/') || path.includes('/getroles') || path.includes('/my-sidebar-menu')) {
    return next();
  }

  // Map HTTP methods to permissions
  const methodToPermission = {
    'GET': 'canView',
    'POST': 'canCreate',
    'PUT': 'canUpdate',
    'PATCH': 'canUpdate', 
    'DELETE': 'canDelete'
  };

  // Map route paths to menu slugs
  const pathToMenuMap = {
    '/categories': 'categories',
    '/category': 'categories',
    '/products': 'products',
    '/product': 'products',
    '/users': 'users',
    '/user': 'users',
    '/companies': 'companies',
    '/company': 'companies',
    '/orders': 'orders',
    '/order': 'orders',
    '/parties': 'parties',
    '/party': 'parties'
  };

  // Find menu slug from path
  let menuSlug = null;
  for (const [pathPattern, slug] of Object.entries(pathToMenuMap)) {
    if (path.includes(pathPattern)) {
      menuSlug = slug;
      break;
    }
  }

  // Skip if no menu mapping found
  if (!menuSlug) {
    return next();
  }

  const requiredPermission = methodToPermission[method];
  if (!requiredPermission) {
    return next();
  }

  // Get menu item from new Menu table
  const menu = await prisma.menu.findUnique({
    where: { slug: menuSlug }
  });

  if (!menu) {
    return next(); // Skip if menu not found
  }

  // Get user permission from new structure
  const userPermission = await prisma.userPermission.findFirst({
    where: {
      userId: userId,
      menuId: menu.id,
      submenuId: null
    }
  });

  // Check permission
  if (!userPermission || !userPermission[requiredPermission]) {
    const actionName = requiredPermission.replace('can', '').toLowerCase();
    throw new ApiError(403, `You don't have ${actionName} permission for this resource`);
  }

  next();
});