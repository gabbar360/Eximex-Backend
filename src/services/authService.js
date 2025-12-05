import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import { generateAccessAndRefreshTokens } from '../utils/tokenUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

  // Get default ADMIN role
  const defaultRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' },
  });

  if (!defaultRole) {
    throw new ApiError(
      500,
      'Default ADMIN role not found. Please contact administrator.'
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobileNum: mobileNum?.trim(),
      password: hashedPassword,
      roleId: defaultRole.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobileNum: true,
      role: {
        select: {
          id: true,
          name: true,
          displayName: true,
          permissions: true,
        },
      },
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

  // Check if user has a password (not a Google OAuth user)
  if (!user.password) {
    throw new ApiError(
      401,
      'This account was created with Google. Please sign in with Google or set a password first.'
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
    select: { password: true, googleId: true },
  });

  if (!user) throw new ApiError(404, 'User not found');

  // Check if user signed up with Google (no password)
  if (!user.password && user.googleId) {
    throw new ApiError(
      400,
      'Cannot change password for Google OAuth users. Please use Google account settings.'
    );
  }

  if (!user.password) {
    throw new ApiError(400, 'No password set for this account');
  }

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

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const sendPasswordResetEmail = async (to, resetToken, userName) => {
  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const templatePath = path.join(
    __dirname,
    '../views/password-reset-email-template.ejs'
  );
  const htmlContent = await ejs.renderFile(templatePath, {
    userName,
    resetLink,
  });

  const mailOptions = {
    from: `"EximEx Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Reset Your Password - EximEx',
    text: `Dear ${userName},\n\nYou requested to reset your password. Click the link below to set a new password:\n\n${resetLink}\n\nThis link will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nEximEx Team`,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

const sendPasswordResetConfirmationEmail = async (to, userName) => {
  const templatePath = path.join(
    __dirname,
    '../views/password-reset-confirmation-template.ejs'
  );
  const htmlContent = await ejs.renderFile(templatePath, {
    userName,
    resetTime: new Date().toLocaleString(),
  });

  const mailOptions = {
    from: `"EximEx Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Password Successfully Reset - EximEx',
    text: `Dear ${userName},\n\nYour password has been successfully reset.\n\nIf you didn't make this change, please contact our support team immediately.\n\nBest regards,\nEximEx Security Team`,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

const forgotPassword = async (email) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        googleId: true,
        isBlocked: true,
        status: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'No account found with this email address');
    }

    if (user.isBlocked) {
      throw new ApiError(
        403,
        'Account is blocked. Please contact administrator.'
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new ApiError(
        401,
        'Account is not active. Please contact administrator.'
      );
    }

    if (user.googleId) {
      throw new ApiError(
        400,
        'This account was created with Google. Please sign in with Google or contact support to set a password.'
      );
    }

    const resetToken = generateResetToken();
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpiry: tokenExpiry,
      },
    });

    // Send reset link email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.name);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }

    return {
      message: 'Password reset link sent to your email address',
      email: user.email,
    };
  } catch (error) {
    throw error;
  }
};

const resetPasswordWithToken = async (token, newPassword) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordTokenExpiry: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true,
        status: true,
      },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    if (user.isBlocked) {
      throw new ApiError(
        403,
        'Account is blocked. Please contact administrator.'
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new ApiError(
        401,
        'Account is not active. Please contact administrator.'
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
        refreshToken: null,
      },
    });

    // Send confirmation email
    try {
      await sendPasswordResetConfirmationEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    return {
      message: 'Password reset successfully',
      email: user.email,
    };
  } catch (error) {
    throw error;
  }
};

const logoutUser = async (userId) => {
  return { message: 'Logged out successfully' };
};

export const AuthService = {
  registerUser,
  loginUser,
  refreshAccessToken,
  changePassword,
  forgotPassword,
  resetPasswordWithToken,
  logoutUser,
};
