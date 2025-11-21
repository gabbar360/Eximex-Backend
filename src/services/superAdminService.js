import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import path from 'path';
import ejs from 'ejs';
import { fileURLToPath } from 'url';

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

export const superAdminService = {
  // Get all users
  async getAllUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        companyId: true,
        status: true,
        isBlocked: true,
        createdAt: true,
        role: true,
        company: true
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Get user by ID
  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        roleId: true,
        companyId: true,
        status: true,
        isBlocked: true,
        createdAt: true,
        role: true,
        company: true,
        userPermissions: {
          include: {
            menuItem: true
          }
        }
      }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  // Create user with invitation
  async createUser(data) {
    const { name, email, password, roleId, companyId, sendInvitation = true } = data;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    let userData = {
      name,
      email,
      roleId: parseInt(roleId),
      companyId: companyId ? parseInt(companyId) : null
    };

    // If password provided, hash it and set user as active
    if (password && password.trim() !== '') {
      userData.password = await bcrypt.hash(password, 10);
      userData.status = 'ACTIVE';
    } else {
      // No password - send invitation
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      userData.password = null;
      userData.status = 'INVITED';
      userData.resetPasswordToken = invitationToken;
      userData.resetPasswordTokenExpiry = tokenExpiry;
    }

    const user = await prisma.user.create({
      data: userData,
      include: {
        role: true,
        company: true
      }
    });

    // Send invitation email if no password was provided
    if (!password || password.trim() === '') {
      try {
        await this.sendInvitationEmail(user.email, user.name, userData.resetPasswordToken, user.role?.displayName, user.company?.name);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
      }
    }

    return user;
  },

  // Send invitation email
  async sendInvitationEmail(email, userName, invitationToken, userRole, companyName) {
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/set-password?token=${invitationToken}`;
    
    console.log('🔗 Invitation link generated:', invitationLink);

    const templatePath = path.join(
      __dirname,
      '../views/user-invitation-template.ejs'
    );
    
    const htmlContent = await ejs.renderFile(templatePath, {
      userName,
      userEmail: email,
      userRole: userRole || 'User',
      companyName,
      invitationLink,
    });

    const mailOptions = {
      from: `"EximEx Team" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to EximEx - Set Your Password',
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 Invitation email sent to:', email);
  },

  // Set password for invited user
  async setInvitedUserPassword(token, password) {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordTokenExpiry: {
          gt: new Date(),
        },
        status: 'INVITED'
      }
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired invitation token');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    return await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        status: 'ACTIVE',
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
        isEmailVerified: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true
      }
    });
  },

  // Update user
  async updateUser(id, data) {
    const { name, email, password, roleId, companyId, status } = data;

    const updateData = {};
    
    // Only update fields that are provided
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (roleId !== undefined) updateData.roleId = parseInt(roleId);
    if (companyId !== undefined) updateData.companyId = companyId ? parseInt(companyId) : null;
    if (status !== undefined) updateData.status = status;

    // Hash password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    return await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        companyId: true,
        status: true,
        isBlocked: true,
        createdAt: true,
        role: true,
        company: true
      }
    });
  },

  // Delete user
  async deleteUser(id) {
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    return true;
  }
};