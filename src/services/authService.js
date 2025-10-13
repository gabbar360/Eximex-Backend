import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import { generateAccessAndRefreshTokens } from '../utils/tokenUtils.js';

const registerUser = async (userData) => {
  const { name, email, mobileNum, password } = userData;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        ...(mobileNum ? [{ mobileNum }] : []),
      ],
    },
  });

  if (existingUser) {
    throw new ApiError(
      409,
      'User with this email, or mobile number already exists'
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobileNum: mobileNum?.trim(),
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobileNum: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return newUser;
};

const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      mobileNum: true,
      password: true,
      role: true,
      status: true,
      isBlocked: true,
      lastLogin: true,
      companyId: true,
      company: {
        select: {
          id: true,
          name: true,
          logo: true,
          address: true,
          gstNumber: true,
          iecNumber: true,
          currencies: true,
          defaultCurrency: true,
          allowedUnits: true,
          isActive: true,
          planId: true,
        },
      },
    },
  });

  if (!user) throw new ApiError(404, 'User not found');

  if (user.isBlocked) {
    throw new ApiError(
      403,
      'Your account has been blocked. Please contact administrator.'
    );
  }

  if (user.status !== 'ACTIVE') {
    throw new ApiError(
      401,
      'Account is deactivated. Please contact administrator.'
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new ApiError(401, 'Invalid credentials');

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user.id
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
};

const refreshAccessToken = async (refreshToken) => {
  try {
    const decodedToken = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) throw new ApiError(401, 'Invalid refresh token');

    if (user.status !== 'ACTIVE') {
      throw new ApiError(401, 'Account is deactivated');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    throw new ApiError(401, 'Invalid refresh token');
  }
};

const changePassword = async (userId, oldPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) throw new ApiError(404, 'User not found');

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordValid)
    throw new ApiError(400, 'Current password is incorrect');

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword },
  });

  return { message: 'Password changed successfully' };
};

const logoutUser = async (userId) => {
  return { message: 'Logged out successfully' };
};

export const AuthService = {
  registerUser,
  loginUser,
  refreshAccessToken,
  changePassword,
  logoutUser,
};
