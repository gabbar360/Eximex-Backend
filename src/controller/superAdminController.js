import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { superAdminService } from '../services/superAdminService.js';
import { prisma } from '../config/dbConfig.js';
import { ApiError } from '../utils/ApiError.js';

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await superAdminService.getAllUsers();

  return res
    .status(200)
    .json(new ApiResponse(200, users, 'Users fetched successfully'));
});

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await superAdminService.getUserById(id);

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'User fetched successfully'));
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await superAdminService.createUser(req.body);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        user,
        'User created and invitation sent successfully'
      )
    );
});

export const setInvitedUserPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await superAdminService.setInvitedUserPassword(token, password);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        'Password set successfully. Welcome to EximEx!'
      )
    );
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await superAdminService.updateUser(id, req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'User updated successfully...........'));
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await superAdminService.deleteUser(id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'User deleted successfully'));
});

export const validateInvitationToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordTokenExpiry: {
        gt: new Date(),
      },
      status: 'INVITED',
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired invitation token');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, 'Valid invitation token'));
});
