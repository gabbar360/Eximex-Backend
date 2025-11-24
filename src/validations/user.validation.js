import Joi from 'joi';

const createUser = {
  body: Joi.object().keys({
    name: Joi.string().required().min(2).max(50).trim(),
    email: Joi.string().required().email().lowercase().trim(),
    mobileNum: Joi.string()
      .optional()
      .pattern(/^[0-9]{10,15}$/),
    password: Joi.string().required().min(8).max(128),
    role: Joi.string()
      .valid('SUPER_ADMIN', 'ADMINISTRATOR', 'ADMIN', 'STAFF')
      .default('STAFF'),
    companyId: Joi.number().optional(),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    id: Joi.number().required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().optional().min(2).max(50).trim(),
      email: Joi.string().optional().email().lowercase().trim(),
      mobileNum: Joi.string()
        .optional()
        .pattern(/^[0-9]{10,15}$/),
      role: Joi.string()
        .optional()
        .valid('SUPER_ADMIN', 'ADMINISTRATOR', 'ADMIN', 'STAFF'),
      roleId: Joi.number().optional(),
      status: Joi.string()
        .optional()
        .valid(
          'ACTIVE',
          'INACTIVE',
          'SUSPENDED',
          'PENDING',
          'INVITED',
          'DELETED'
        ),
    })
    .min(1),
};

const getUser = {
  params: Joi.object().keys({
    id: Joi.number().required(),
  }),
};

const changePassword = {
  params: Joi.object().keys({
    id: Joi.number().required(),
  }),
  body: Joi.object().keys({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required().min(8).max(128),
  }),
};

const reassignData = {
  body: Joi.object().keys({
    fromUserId: Joi.number().required(),
    toUserId: Joi.number().required(),
  }),
};

const deleteAndReassign = {
  params: Joi.object().keys({
    id: Joi.number().required(),
  }),
  body: Joi.object().keys({
    reassignToUserId: Joi.number().required(),
  }),
};

const resetPassword = {
  params: Joi.object().keys({
    id: Joi.number().required(),
  }),
  body: Joi.object().keys({
    newPassword: Joi.string().required().min(8).max(128),
  }),
};

export const userValidation = {
  createUser,
  updateUser,
  getUser,
  changePassword,
  reassignData,
  deleteAndReassign,
  resetPassword,
};
