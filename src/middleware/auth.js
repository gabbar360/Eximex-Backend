import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/dbConfig.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(401, 'Unauthorized request');
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decodedToken?.userId },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            permissions: true
          }
        },
        status: true,
        isBlocked: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid Access Token');
    }

    if (user.status !== 'ACTIVE') {
      throw new ApiError(401, 'User account is deactivated');
    }

    if (user.isBlocked) {
      throw new ApiError(401, 'User account is blocked');
    }

    if (user.company && !user.company.isActive) {
      throw new ApiError(401, 'Company account is deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});

// Global permission check middleware
export const checkPermissions = asyncHandler(async (req, res, next) => {
  // Skip permission check for certain routes
  const skipRoutes = ['/auth/', '/super-admin/', '/getroles', '/my-sidebar-menu'];
  const shouldSkip = skipRoutes.some(route => req.path.includes(route));
  
  if (shouldSkip) {
    return next();
  }

  // Auto-detect menu slug from route path
  const pathSegments = req.path.split('/').filter(Boolean);
  let menuSlug = null;
  
  // Map route patterns to menu slugs
  const routeToMenuMap = {
    'categories': 'categories',
    'products': 'products', 
    'users': 'users',
    'companies': 'companies',
    'orders': 'orders',
    'parties': 'parties'
  };
  
  // Find matching menu slug
  for (const segment of pathSegments) {
    if (routeToMenuMap[segment]) {
      menuSlug = routeToMenuMap[segment];
      break;
    }
  }
  
  if (!menuSlug) {
    return next(); // Skip if no menu mapping found
  }
  
  // Check permissions
  const userId = req.user.id;
  const method = req.method;
  
  const methodToPermission = {
    'GET': 'canView',
    'POST': 'canCreate',
    'PUT': 'canUpdate', 
    'PATCH': 'canUpdate',
    'DELETE': 'canDelete'
  };
  
  const requiredPermission = methodToPermission[method];
  if (!requiredPermission) {
    return next();
  }
  
  // Get menu item and check permission
  const menuItem = await prisma.menuItem.findUnique({
    where: { slug: menuSlug }
  });
  
  if (!menuItem) {
    return next(); // Skip if menu item not found
  }
  
  const userPermission = await prisma.userPermission.findFirst({
    where: {
      userId: userId,
      menuItemId: menuItem.id
    }
  });
  
  if (!userPermission || !userPermission[requiredPermission]) {
    const actionName = requiredPermission.replace('can', '').toLowerCase();
    throw new ApiError(403, `You don't have ${actionName} permission for this resource`);
  }
  
  next();
});

export const verifyRefreshToken = asyncHandler(async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token is required');
    }

    const decodedToken = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await prisma.user.findUnique({
      where: { id: decodedToken?.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid Refresh Token');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh token');
  }
});

export const authorizeRoles = (...roleNames) => {
  return (req, res, next) => {
    if (!req.user?.role || !roleNames.includes(req.user.role.name)) {
      return next(
        new ApiError(403, "You don't have permission to access this resource")
      );
    }
    next();
  };
};

// New permission-based authorization
export const authorizePermissions = (...permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user?.role?.permissions || {};
    
    const hasPermission = permissions.some(permission => 
      userPermissions[permission] === true
    );
    
    if (!hasPermission) {
      return next(
        new ApiError(403, "You don't have permission to access this resource")
      );
    }
    next();
  };
};

export const checkCompanyExists = asyncHandler(async (req, res, next) => {
  if (req.user?.companyId) {
    throw new ApiError(
      400,
      'User already has a company. Cannot create another company.'
    );
  }
  next();
});

export const requireCompany = asyncHandler(async (req, res, next) => {
  // Super Admin doesn't need company requirement
  if (req.user?.role?.name === 'SUPER_ADMIN') {
    return next();
  }
  
  if (!req.user?.companyId) {
    throw new ApiError(
      400,
      'User must have a company to access this resource.'
    );
  }
  next();
});

// Middleware to ensure data access is scoped to user's company
export const scopeToCompany = asyncHandler(async (req, res, next) => {
  if (!req.user?.companyId) {
    throw new ApiError(400, 'User must belong to a company');
  }

  // Add company filter to query parameters
  req.companyFilter = { companyId: req.user.companyId };
  next();
});

// Middleware to check data ownership for staff users
export const checkDataOwnership = (entityType) => {
  return asyncHandler(async (req, res, next) => {
    const { user } = req;

    // Admins can access all company data
    if (user.role?.name === 'ADMIN' || user.role?.name === 'SUPER_ADMIN') {
      return next();
    }

    // Staff can only access their own data
    if (user.role?.name === 'STAFF') {
      const entityId = req.params.id;
      if (!entityId) return next();

      // Check if the entity belongs to the current user
      const entity = await prisma[entityType].findFirst({
        where: {
          id: parseInt(entityId),
          companyId: user.companyId,
          createdBy: user.id,
        },
      });

      if (!entity) {
        throw new ApiError(
          403,
          'Access denied: You can only access your own data'
        );
      }
    }

    next();
  });
};

// Middleware to filter data based on user role
export const filterByRole = asyncHandler(async (req, res, next) => {
  const { user } = req;

  // Add role-based filters
  if (user.role?.name === 'STAFF') {
    req.roleFilter = { createdBy: user.id };
  } else {
    req.roleFilter = {}; // Admins see all company data
  }

  next();
});

// Middleware to validate staff management permissions
export const validateStaffManagement = asyncHandler(async (req, res, next) => {
  const { user } = req;
  const targetUserId = req.params.id;

  // Only admins can manage staff
  if (user.role?.name !== 'ADMIN' && user.role?.name !== 'SUPER_ADMIN') {
    throw new ApiError(403, 'Only admins can manage staff accounts');
  }

  // If updating/deleting a user, ensure they belong to the same company
  if (targetUserId) {
    const targetUser = await prisma.user.findFirst({
      where: {
        id: parseInt(targetUserId),
        companyId: user.companyId,
      },
    });

    if (!targetUser) {
      throw new ApiError(404, 'User not found in your company');
    }

    // Prevent admins from modifying super admins
    if (targetUser.role?.name === 'SUPER_ADMIN' && user.role?.name !== 'SUPER_ADMIN') {
      throw new ApiError(403, 'Cannot modify super admin accounts');
    }
  }

  next();
});

// Alias for backward compatibility
export const authenticate = verifyJWT;
