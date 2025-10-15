import { asyncHandler } from '../utils/asyncHandler.js';
import { setTokenCookies } from '../utils/tokenUtils.js';
import { GoogleAuthService } from '../services/googleAuthService.js';

// Google OAuth Success
export const googleCallback = asyncHandler(async (req, res) => {
  const result = await GoogleAuthService.handleGoogleCallback(req.user);
  
  // Set cookies
  setTokenCookies(res, result.accessToken, result.refreshToken);
  
  // Redirect to frontend with tokens
  res.redirect(result.redirectUrl);
});

// Google OAuth Failure
export const googleFailure = asyncHandler(async (req, res) => {
  const result = GoogleAuthService.handleGoogleFailure();
  res.redirect(result.redirectUrl);
});