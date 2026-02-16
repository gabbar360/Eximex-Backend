// src/controller/authController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AuthService } from '../services/authService.js';
import { setTokenCookies, clearTokenCookies } from '../utils/tokenUtils.js';
import { prisma } from '../config/dbConfig.js';

// Register User
export const registerUser = asyncHandler(async (req, res) => {
  const userData = req.body;

  const newUser = await AuthService.registerUser(userData);

  return res
    .status(201)
    .json(new ApiResponse(201, newUser, 'User registered successfully'));
});

// Login User
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, accessToken, refreshToken } = await AuthService.loginUser(
    email,
    password
  );

  setTokenCookies(res, accessToken, refreshToken);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user, accessToken, refreshToken },
        'Login successful'
      )
    );
});

// Refresh Access Token
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const { accessToken, refreshToken: newRefreshToken } =
    await AuthService.refreshAccessToken(refreshToken);

  // Set new cookies
  setTokenCookies(res, accessToken, newRefreshToken);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        'Access token refreshed'
      )
    );
});

// Logout User
export const logout = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (userId) {
    await AuthService.logoutUser(userId);
  }

  // Clear cookies
  clearTokenCookies(res);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Logged out successfully'));
});

// Change Password
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  const result = await AuthService.changePassword(
    userId,
    oldPassword,
    newPassword
  );

  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Password changed successfully'));
});
export const verifyToken = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { valid: true, userId: req.user.id },
        'Token is valid'
      )
    );
});

// Forgot Password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await AuthService.forgotPassword(email);
  return res
    .status(200)
    .json(new ApiResponse(200, { email: result.email }, result.message));
});

// Reset Password with Token
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await AuthService.resetPasswordWithToken(token, newPassword);
  return res
    .status(200)
    .json(new ApiResponse(200, { email: result.email }, result.message));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  // guard-rail in case middleware wasn’t applied
  if (!req.user?.id) {
    return res.status(401).json(new ApiResponse(401, null, 'Unauthenticated'));
  }

  // fetch user; exclude password by selecting only the columns you need
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      mobileNum: true,
      role: true,
      status: true,
      lastLogin: true,
      companyId: true,
      profilePicture: true,
      googleId: true,
      isEmailVerified: true,
      company: {
        select: {
          id: true,
          name: true,
          logo: true,
          signature: true,
          address: true,
          phoneNo: true,
          email: true,
          gstNumber: true,
          iecNumber: true,
          currencies: true,
          defaultCurrency: true,
          allowedUnits: true,
          isActive: true,
          planId: true,
          bankDetails: true,
        },
      },
    },
  });

  // Format logo URL if company exists and has logo
  if (user.company?.logo) {
    if (
      !user.company.logo.startsWith('http') &&
      !user.company.logo.startsWith('/uploads')
    ) {
      user.company.logo = `/uploads/logos/${user.company.logo}`;
    }
  }

  // Format signature URL if company exists and has signature
  if (user.company?.signature) {
    if (
      !user.company.signature.startsWith('http') &&
      !user.company.signature.startsWith('/uploads')
    ) {
      user.company.signature = `/uploads/signatures/${user.company.signature}`;
    }
  }

  // Profile is complete if user has a company and company is active
  const isProfileComplete = !!(
    user.companyId &&
    user.company &&
    user.company.isActive
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { ...user, isProfileComplete },
        'Current user retrieved successfully'
      )
    );
});
