import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Generic middleware to apply company and role-based filtering
export const applyDataFilters = (entityName) => {
  return asyncHandler(async (req, res, next) => {
    const { user } = req;

    if (!user.companyId) {
      throw new ApiError(400, 'User must belong to a company');
    }

    // Base company filter
    req.dataFilters = {
      companyId: user.companyId,
    };

    // Add role-based filters
    if (user.role === 'STAFF') {
      req.dataFilters.createdBy = user.id;
    }
    // Admins see all company data (no additional filter needed)

    next();
  });
};

// Middleware to check entity ownership before operations
export const checkEntityOwnership = (entityName) => {
  return asyncHandler(async (req, res, next) => {
    const { user } = req;
    const entityId = req.params.id;

    if (!entityId) return next();

    // Admins can access all company data
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Staff can only access their own data
    if (user.role === 'STAFF') {
      const entity = await prisma[entityName].findFirst({
        where: {
          id: parseInt(entityId),
          companyId: user.companyId,
          createdBy: user.id,
        },
      });

      if (!entity) {
        throw new ApiError(
          403,
          `Access denied: You can only access your own ${entityName}`
        );
      }
    }

    next();
  });
};

// Middleware to ensure created entities are properly scoped
export const ensureEntityScoping = asyncHandler(async (req, res, next) => {
  const { user } = req;

  // Store user context for controllers to use, don't modify req.body
  req.userContext = {
    companyId: user.companyId,
    userId: user.id,
  };

  // For updates, ensure user can only update their own data (if staff)
  if (
    (req.method === 'PUT' || req.method === 'PATCH') &&
    user.role === 'STAFF'
  ) {
    // The checkEntityOwnership middleware should handle this
  }

  next();
});

export default {
  applyDataFilters,
  checkEntityOwnership,
  ensureEntityScoping,
};
