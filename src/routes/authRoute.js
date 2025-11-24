import { Router } from 'express';
import {
  registerUser,
  login,
  logout,
  refreshAccessToken,
  changePassword,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  verifyToken,
} from '../controller/authController.js';
import { validate } from '../middleware/validate.js';
import { authValidation } from '../validations/auth.validation.js';
// import { authLimiter, apiLimiter } from '../middleware/rateLimiter.js';
import { verifyJWT, verifyRefreshToken } from '../middleware/auth.js';

const router = Router();

// Auth routes with rate limiting and validation
router.post(
  '/register',
  // authLimiter,
  validate(authValidation.register),
  registerUser
);
router.post('/login', validate(authValidation.login), login); //authLimiter,
router.post('/logout', verifyJWT, logout);
router.post(
  '/refresh-token',
  // apiLimiter,
  validate(authValidation.refreshToken),
  verifyRefreshToken,
  refreshAccessToken
);
router.post(
  '/change-password',
  verifyJWT,
  validate(authValidation.changePassword),
  changePassword
);
router.post(
  '/forgot-password',
  validate(authValidation.forgotPassword),
  forgotPassword
);
router.post(
  '/reset-password',
  validate(authValidation.resetPassword),
  resetPassword
);
router.get('/verify-token', verifyJWT, verifyToken);
router.get('/me', verifyJWT, getCurrentUser);

export default router;
