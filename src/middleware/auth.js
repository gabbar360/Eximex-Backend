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
            permissions: true,
          },
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

    // Auto permission check
    await autoCheckPermissions(req, res, next);
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});

// Auto permission check function
const autoCheckPermissions = async (req, res, next) => {
  // Check if user exists
  if (!req.user || !req.user.id) {
    return next();
  }

  const userId = req.user.id;
  const method = req.method;
  const path = req.path;

  // Skip for specific routes
  if (
    path.includes('/auth/') ||
    path.includes('/super-admin/') ||
    path.includes('/getroles') ||
    path.includes('/my-sidebar-menu') ||
    path.includes('/user-permissions')
  ) {
    return next();
  }

  // Map HTTP methods to permissions
  const methodToPermission = {
    GET: 'canView',
    POST: 'canCreate',
    PUT: 'canUpdate',
    PATCH: 'canUpdate',
    DELETE: 'canDelete',
  };

  // Dynamic menu slug detection from path
  let menuSlug = null;
  const pathSegments = path.split('/').filter(Boolean);

  // Smart pattern matching function
  const getMenuSlugFromSegment = (segment) => {
    // Direct matches
    const directMatches = {
      dashboard: 'dashboard',
      contacts: 'contacts',
      categories: 'categories',
      products: 'products',
      orders: 'orders',
      'purchase-orders': 'purchase-orders',
      'staff-management': 'staff-management',
      profile: 'user-profile',
    };

    if (directMatches[segment]) return directMatches[segment];

    // Pattern-based matches
    if (segment.includes('category') || segment.includes('categories'))
      return 'categories';
    if (segment.includes('product') || segment.includes('products'))
      return 'products';
    if (segment.includes('proforma') || segment.includes('pi'))
      return 'proforma-invoices';
    if (
      segment.includes('customer') ||
      segment.includes('prospect') ||
      segment.includes('parties') ||
      segment.includes('party') ||
      segment.includes('contact')
    )
      return 'contacts';
    if (segment.includes('order') && !segment.includes('purchase'))
      return 'orders';
    if (segment.includes('purchase')) return 'purchase-orders';
    if (segment.includes('staff')) return 'staff-management';
    if (segment.includes('profile')) return 'user-profile';

    return null;
  };

  // Submenu patterns
  const submenuPatterns = {
    'all-orders': { menu: 'orders', submenu: 'all-orders' },
    'delete-order': { menu: 'orders', submenu: 'all-orders' },
    'create-order': { menu: 'orders', submenu: 'all-orders' },
    'update-order': { menu: 'orders', submenu: 'all-orders' },
    orders: { menu: 'orders', submenu: 'all-orders' },
    shipments: { menu: 'orders', submenu: 'shipments' },
    'packing-lists': { menu: 'orders', submenu: 'packing-lists' },
    'vgm-documents': { menu: 'orders', submenu: 'vgm-documents' },
    vgm: { menu: 'orders', submenu: 'vgm-documents' },
    reports: { menu: 'orders', submenu: 'reports' },
  };

  let submenuSlug = null;

  // First check for submenu patterns
  for (const segment of pathSegments) {
    if (submenuPatterns[segment]) {
      menuSlug = submenuPatterns[segment].menu;
      submenuSlug = submenuPatterns[segment].submenu;
      break;
    }
  }

  // If no submenu found, check for menu patterns
  if (!menuSlug) {
    for (const segment of pathSegments) {
      const foundSlug = getMenuSlugFromSegment(segment);
      if (foundSlug) {
        menuSlug = foundSlug;
        break;
      }
    }
  }

  // Skip if no menu mapping found
  if (!menuSlug) {
    console.log(`🔍 DEBUG: No menu mapping found for path: ${path}`);
    console.log(`🔍 DEBUG: Path segments: [${pathSegments.join(', ')}]`);
    return next();
  }

  console.log(`✅ DEBUG: Found menu slug: ${menuSlug} for path: ${path}`);
  console.log(`🔍 DEBUG: Submenu slug: ${submenuSlug || 'null'}`);
  console.log(`🔍 DEBUG: Path segments: [${pathSegments.join(', ')}]`);

  const requiredPermission = methodToPermission[method];
  if (!requiredPermission) {
    return next();
  }

  // Get menu item from Menu table
  const menu = await prisma.menu.findUnique({
    where: { slug: menuSlug },
  });

  if (!menu) {
    return next();
  }

  let userPermission;

  if (submenuSlug) {
    // Check submenu permission
    const submenu = await prisma.submenu.findFirst({
      where: {
        slug: submenuSlug,
        menuId: menu.id,
      },
    });

    if (submenu) {
      userPermission = await prisma.userPermission.findFirst({
        where: {
          userId: userId,
          submenuId: submenu.id,
        },
      });
    }
  } else {
    // Check menu permission
    userPermission = await prisma.userPermission.findFirst({
      where: {
        userId: userId,
        menuId: menu.id,
        submenuId: null,
      },
    });
  }

  // Check permission
  if (!userPermission || !userPermission[requiredPermission]) {
    const actionName = requiredPermission.replace('can', '').toLowerCase();
    const resourceName = submenuSlug ? `${menuSlug}/${submenuSlug}` : menuSlug;
    throw new ApiError(
      403,
      `You don't have ${actionName} permission for ${resourceName}`
    );
  }

  next();
};

// Global permission check middleware
export const checkPermissions = asyncHandler(async (req, res, next) => {
  // Check if user exists
  if (!req.user || !req.user.id) {
    return next();
  }

  // Skip permission check for certain routes
  const skipRoutes = [
    '/auth/',
    '/super-admin/',
    '/getroles',
    '/my-sidebar-menu',
    '/invitation/',
  ];
  const shouldSkip = skipRoutes.some((route) => req.path.includes(route));

  if (shouldSkip) {
    return next();
  }

  // Auto-detect menu slug from route path
  const pathSegments = req.path.split('/').filter(Boolean);
  let menuSlug = null;

  // Smart pattern matching for checkPermissions
  const getMenuSlugFromSegment = (segment) => {
    const directMatches = {
      dashboard: 'dashboard',
      contacts: 'contacts',
      categories: 'categories',
      products: 'products',
      orders: 'orders',
      'purchase-orders': 'purchase-orders',
      'staff-management': 'staff-management',
      profile: 'user-profile',
    };

    if (directMatches[segment]) return directMatches[segment];

    if (segment.includes('category') || segment.includes('categories'))
      return 'categories';
    if (segment.includes('product') || segment.includes('products'))
      return 'products';
    if (segment.includes('proforma') || segment.includes('pi'))
      return 'proforma-invoices';
    if (
      segment.includes('customer') ||
      segment.includes('prospect') ||
      segment.includes('parties') ||
      segment.includes('party') ||
      segment.includes('contact')
    )
      return 'contacts';
    if (segment.includes('order') && !segment.includes('purchase'))
      return 'orders';
    if (segment.includes('purchase')) return 'purchase-orders';
    if (segment.includes('staff')) return 'staff-management';
    if (segment.includes('profile')) return 'user-profile';

    return null;
  };

  // Submenu patterns
  const submenuToMenuMap = {
    'all-orders': { menu: 'orders', submenu: 'all-orders' },
    'delete-order': { menu: 'orders', submenu: 'all-orders' },
    'create-order': { menu: 'orders', submenu: 'all-orders' },
    'update-order': { menu: 'orders', submenu: 'all-orders' },
    orders: { menu: 'orders', submenu: 'all-orders' },
    shipments: { menu: 'orders', submenu: 'shipments' },
    'packing-lists': { menu: 'orders', submenu: 'packing-lists' },
    'vgm-documents': { menu: 'orders', submenu: 'vgm-documents' },
    vgm: { menu: 'orders', submenu: 'vgm-documents' },
    reports: { menu: 'orders', submenu: 'reports' },
  };

  let submenuSlug = null;

  // First check for submenu patterns
  for (const segment of pathSegments) {
    if (submenuToMenuMap[segment]) {
      menuSlug = submenuToMenuMap[segment].menu;
      submenuSlug = submenuToMenuMap[segment].submenu;
      break;
    }
  }

  // If no submenu found, check for menu patterns
  if (!menuSlug) {
    for (const segment of pathSegments) {
      const foundSlug = getMenuSlugFromSegment(segment);
      if (foundSlug) {
        menuSlug = foundSlug;
        break;
      }
    }
  }

  if (!menuSlug) {
    return next(); // Skip if no menu mapping found
  }

  // Check permissions
  const userId = req.user.id;
  const method = req.method;

  const methodToPermission = {
    GET: 'canView',
    POST: 'canCreate',
    PUT: 'canUpdate',
    PATCH: 'canUpdate',
    DELETE: 'canDelete',
  };

  const requiredPermission = methodToPermission[method];
  if (!requiredPermission) {
    return next();
  }

  // Get menu item and check permission
  const menu = await prisma.menu.findUnique({
    where: { slug: menuSlug },
  });

  if (!menu) {
    return next(); // Skip if menu item not found
  }

  let userPermission;

  if (submenuSlug) {
    // Check submenu permission
    const submenu = await prisma.submenu.findFirst({
      where: {
        slug: submenuSlug,
        menuId: menu.id,
      },
    });

    if (submenu) {
      userPermission = await prisma.userPermission.findFirst({
        where: {
          userId: userId,
          submenuId: submenu.id,
        },
      });
    }
  } else {
    // Check menu permission
    userPermission = await prisma.userPermission.findFirst({
      where: {
        userId: userId,
        menuId: menu.id,
        submenuId: null,
      },
    });
  }

  if (!userPermission || !userPermission[requiredPermission]) {
    const actionName = requiredPermission.replace('can', '').toLowerCase();
    const resourceName = submenuSlug ? `${menuSlug}/${submenuSlug}` : menuSlug;
    throw new ApiError(
      403,
      `You don't have ${actionName} permission for ${resourceName}`
    );
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

    const hasPermission = permissions.some(
      (permission) => userPermissions[permission] === true
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

// Dynamic permission-based data filtering
export const filterByRole = asyncHandler(async (req, res, next) => {
  const { user } = req;

  console.log('🔍 FILTER_BY_ROLE MIDDLEWARE CALLED');
  console.log(
    'User:',
    user?.name,
    'ID:',
    user?.id,
    'Company:',
    user?.companyId
  );

  if (!user || !user.id) {
    req.roleFilter = {};
    console.log('❌ No user found, setting empty filter');
    return next();
  }

  // Get user's role permissions
  const userRole = await prisma.role.findUnique({
    where: { id: user.roleId },
    select: { permissions: true, name: true },
  });

  const permissions = userRole?.permissions || {};
  console.log('Role:', userRole?.name, 'Permissions:', permissions);

  // Check if user has company-wide data access permission
  if (permissions.canViewAllCompanyData === true) {
    req.roleFilter = {}; // Can see all company data
    console.log('✅ Admin access: Can see all company data');
  } else {
    req.roleFilter = { createdBy: user.id }; // Only own data
    console.log('🔒 Staff access: Only own data (createdBy:', user.id, ')');
  }

  console.log('Final roleFilter:', req.roleFilter);
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

  // Super admins can update users from any company
  if (user.role?.name === 'SUPER_ADMIN') {
    return next();
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
      throw new ApiError(403, 'Cannot update user from different company');
    }

    // Prevent admins from modifying super admins
    if (
      targetUser.role?.name === 'SUPER_ADMIN' &&
      user.role?.name !== 'SUPER_ADMIN'
    ) {
      throw new ApiError(403, 'Cannot modify super admin accounts');
    }
  }

  next();
});

// Alias for backward compatibility
export const authenticate = verifyJWT;
