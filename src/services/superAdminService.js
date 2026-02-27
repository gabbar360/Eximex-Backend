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

const getAllUsers = async (options = {}) => {
  try {
    const { page = 1, limit = 10, search = '' } = options;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          company: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    };
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw new ApiError(500, 'Database error while fetching users');
  }
};

const getUserById = async (id) => {
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
          menuItem: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

const createUser = async (data) => {
  const {
    name,
    email,
    password,
    roleId,
    companyId,
    sendInvitation = true,
  } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(400, 'User with this email already exists');
  }

  let userData = {
    name,
    email,
    roleId: parseInt(roleId),
    companyId: companyId ? parseInt(companyId) : null,
  };

  // If password provided, hash it and set user as active
  if (password && password.trim() !== '') {
    userData.password = await bcrypt.hash(password, 10);
    userData.status = 'ACTIVE';
  } else {
    // No password - send invitation
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    userData.password = null;
    userData.status = 'INVITED';
    userData.resetPasswordToken = invitationToken;
    userData.resetPasswordTokenExpiry = tokenExpiry;
  }

  const user = await prisma.user.create({
    data: userData,
    include: {
      role: true,
      company: true,
    },
  });

  // Send invitation email if no password was provided
  if (!password || password.trim() === '') {
    try {
      await sendInvitationEmail(
        user.email,
        user.name,
        userData.resetPasswordToken,
        user.role?.displayName,
        user.company?.name
      );
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }
  }

  return user;
};

const sendInvitationEmail = async (
  email,
  userName,
  invitationToken,
  userRole,
  companyName
) => {
  const invitationLink = `${process.env.FRONTEND_URL}/set-password?token=${invitationToken}`;
  console.log('link', invitationLink);
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
};

const setInvitedUserPassword = async (token, password) => {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordTokenExpiry: {
        gt: new Date(),
      },
      status: 'INVITED',
    },
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
      isEmailVerified: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
  });
};

const updateUser = async (id, data) => {
  const { name, email, password, roleId, companyId, status } = data;

  const updateData = {};

  // Only update fields that are provided
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (roleId !== undefined) updateData.roleId = parseInt(roleId);
  if (companyId !== undefined)
    updateData.companyId = companyId ? parseInt(companyId) : null;
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
      company: true,
    },
  });
};

const deleteUser = async (id) => {
  await prisma.user.delete({
    where: { id: parseInt(id) },
  });

  return true;
};

const assignCompanyToUser = async (userId, companyId) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(userId) },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const company = await prisma.companyDetails.findUnique({
    where: { id: parseInt(companyId) },
  });

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  return await prisma.user.update({
    where: { id: parseInt(userId) },
    data: { companyId: parseInt(companyId) },
    include: {
      role: true,
      company: true,
    },
  });
};

const getAllCompanies = async (options = {}) => {
  const { page = 1, limit = 10, search = '' } = options;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [companies, total] = await Promise.all([
    prisma.companyDetails.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        phoneNo: true,
        gstNumber: true,
        iecNumber: true,
        defaultCurrency: true,
        logo: true,
        signature: true,
        isActive: true,
        createdAt: true,
        bankDetails: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.companyDetails.count({ where }),
  ]);

  return {
    data: companies,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNext: pageNum * limitNum < total,
      hasPrev: pageNum > 1,
    },
  };
};

const createCompany = async (data, logoFile = null, signatureFile = null) => {
  const {
    name,
    email,
    address,
    phoneNo,
    gstNumber,
    iecNumber,
    defaultCurrency = 'USD',
    bankDetails,
    // Legacy fields for backward compatibility
    bankName,
    accountNumber,
    ifscCode,
    bankAddress,
    swiftCode,
  } = data;

  const existingCompany = await prisma.companyDetails.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { email: email },
        { gstNumber: gstNumber },
        { iecNumber: iecNumber },
      ],
    },
  });

  if (existingCompany) {
    throw new ApiError(
      400,
      'Company with this name, email, GST, or IEC already exists'
    );
  }

  // Handle bank details
  let bankDetailsData = [];
  if (bankDetails) {
    // Parse bank_details if it's a string
    if (typeof bankDetails === 'string') {
      try {
        bankDetailsData = JSON.parse(bankDetails);
      } catch (e) {
        throw new ApiError(400, 'Invalid JSON in bankDetails field');
      }
    } else {
      bankDetailsData = bankDetails;
    }
  } else if (bankName) {
    // Legacy support - convert single bank fields to array
    bankDetailsData = [
      {
        bank_name: bankName,
        bank_address: bankAddress,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        swift_code: swiftCode,
      },
    ];
  }

  const companyData = {
    name,
    email,
    address,
    phoneNo,
    gstNumber,
    iecNumber,
    currencies: [defaultCurrency],
    defaultCurrency,
    allowedUnits: ['sqm', 'kg', 'pcs', 'box'],
    planId: 'trial',
  };

  // Handle file uploads
  if (logoFile) {
    companyData.logo = `/uploads/logos/${logoFile.filename}`;
  }
  if (signatureFile) {
    companyData.signature = `/uploads/signatures/${signatureFile.filename}`;
  }

  const company = await prisma.companyDetails.create({
    data: {
      ...companyData,
      bankDetails: {
        create: bankDetailsData.map((bank) => ({
          bankName: bank.bank_name,
          bankAddress: bank.bank_address,
          accountNumber: bank.account_number,
          ifscCode: bank.ifsc_code,
          swiftCode: bank.swift_code,
        })),
      },
    },
    include: { bankDetails: true },
  });

  // Format URLs
  if (company.logo && !company.logo.startsWith('/uploads')) {
    company.logo = `/uploads/logos/${company.logo}`;
  }
  if (company.signature && !company.signature.startsWith('/uploads')) {
    company.signature = `/uploads/signatures/${company.signature}`;
  }

  return company;
};

const updateCompany = async (
  id,
  data,
  logoFile = null,
  signatureFile = null
) => {
  const company = await prisma.companyDetails.findUnique({
    where: { id: parseInt(id) },
    include: { bankDetails: true },
  });

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  // Handle bank details update
  let bankDetailsUpdate = null;
  if (data.bankDetails) {
    let bankDetailsData = data.bankDetails;

    // Parse bank_details if it's a string
    if (typeof bankDetailsData === 'string') {
      try {
        bankDetailsData = JSON.parse(bankDetailsData);
      } catch (e) {
        throw new ApiError(400, 'Invalid JSON in bankDetails field');
      }
    }

    bankDetailsUpdate = {
      deleteMany: {}, // Delete all existing bank details
      create: bankDetailsData.map((bank) => ({
        bankName: bank.bank_name,
        bankAddress: bank.bank_address,
        accountNumber: bank.account_number,
        ifscCode: bank.ifsc_code,
        swiftCode: bank.swift_code,
      })),
    };

    // Remove bankDetails from data to avoid Prisma error
    delete data.bankDetails;
  }

  // Handle file uploads
  if (logoFile) {
    data.logo = `/uploads/logos/${logoFile.filename}`;
  }

  if (signatureFile) {
    data.signature = `/uploads/signatures/${signatureFile.filename}`;
  }

  // Prepare update payload
  const updatePayload = {
    ...data,
    ...(bankDetailsUpdate && { bankDetails: bankDetailsUpdate }),
  };

  const updatedCompany = await prisma.companyDetails.update({
    where: { id: parseInt(id) },
    data: updatePayload,
    include: { bankDetails: true },
  });

  // Ensure URLs are properly formatted
  if (updatedCompany.logo && !updatedCompany.logo.startsWith('/uploads')) {
    updatedCompany.logo = `/uploads/logos/${updatedCompany.logo}`;
  }
  if (
    updatedCompany.signature &&
    !updatedCompany.signature.startsWith('/uploads')
  ) {
    updatedCompany.signature = `/uploads/signatures/${updatedCompany.signature}`;
  }

  return updatedCompany;
};

const deleteCompany = async (id) => {
  const company = await prisma.companyDetails.findUnique({
    where: { id: parseInt(id) },
  });

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  await prisma.companyDetails.delete({
    where: { id: parseInt(id) },
  });

  return true;
};

const getCompanyData = async (companyId) => {
  const company = await prisma.companyDetails.findUnique({
    where: { id: parseInt(companyId) },
  });

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  const [products, users, piInvoices, orders] = await Promise.all([
    prisma.product.count({ where: { companyId: parseInt(companyId) } }),
    prisma.user.count({ where: { companyId: parseInt(companyId) } }),
    prisma.piInvoice.count({ where: { companyId: parseInt(companyId) } }),
    prisma.order.count({ where: { companyId: parseInt(companyId) } }),
  ]);

  return {
    company,
    stats: {
      products,
      users,
      piInvoices,
      orders,
    },
  };
};

export const SuperAdminService = {
  getAllUsers,
  getUserById,
  createUser,
  sendInvitationEmail,
  setInvitedUserPassword,
  updateUser,
  deleteUser,
  assignCompanyToUser,
  getAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyData,
};
