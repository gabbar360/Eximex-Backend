import jwt from 'jsonwebtoken';
import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
};

const handleGoogleCallback = async (user) => {
  if (!user) {
    throw new ApiError(401, 'Google authentication failed');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const { accessToken, refreshToken } = generateTokens(user.id);
  
  return {
    user,
    accessToken,
    refreshToken,
    redirectUrl: `${process.env.FRONTEND_URL}?token=${accessToken}&refresh=${refreshToken}`
  };
};

const handleGoogleFailure = () => {
  return {
    redirectUrl: `${process.env.FRONTEND_URL}/signin?error=oauth_failed`
  };
};

export const GoogleAuthService = {
  generateTokens,
  handleGoogleCallback,
  handleGoogleFailure,
};