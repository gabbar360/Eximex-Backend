import { verifyJWT, requireCompany } from '../middleware/auth.js';
import { autoPermission } from '../middleware/autoPermission.js';

// Create protected route group with auto permissions
export const createProtectedRoutes = (router, menuSlug, baseMiddlewares = []) => {
  const defaultMiddlewares = [
    verifyJWT,
    requireCompany,
    autoPermission(menuSlug),
    ...baseMiddlewares
  ];

  return {
    get: (path, ...handlers) => router.get(path, ...defaultMiddlewares, ...handlers),
    post: (path, ...handlers) => router.post(path, ...defaultMiddlewares, ...handlers),
    put: (path, ...handlers) => router.put(path, ...defaultMiddlewares, ...handlers),
    delete: (path, ...handlers) => router.delete(path, ...defaultMiddlewares, ...handlers),
    patch: (path, ...handlers) => router.patch(path, ...defaultMiddlewares, ...handlers)
  };
};