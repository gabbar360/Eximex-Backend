import Joi from 'joi';

const register = {
  body: Joi.object().keys({
    name: Joi.string().required().min(2).max(50).trim(),
    email: Joi.string().required().email().lowercase().trim(),
    mobileNum: Joi.string()
      .optional()
      .pattern(/^[0-9]{10,15}$/),
    password: Joi.string()
      .required()
      .min(8)
      .max(128)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .messages({
        'string.min': 'Password must be at least 8 characters long.',
        'string.pattern.base':
          'Password must include an uppercase letter, a lowercase letter, a number, and a special character.',
      }),
    // confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    //   .messages({ 'any.only': 'Passwords do not match' })
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required().email().lowercase().trim(),
    password: Joi.string().required(),
  }),
};

const refreshToken = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const changePassword = {
  body: Joi.object().keys({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string()
      .required()
      .min(8)
      .max(128)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .messages({
        'string.min': 'Password must be at least 8 characters long.',
        'string.pattern.base':
          'Password must include an uppercase letter, a lowercase letter, a number, and a special character.',
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().required().email().lowercase().trim(),
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    token: Joi.string().required().messages({
      'string.empty': 'Reset token is required',
      'any.required': 'Reset token is required',
    }),
    newPassword: Joi.string()
      .required()
      .min(8)
      .max(128)
      .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .messages({
        'string.min': 'Password must be at least 8 characters long.',
        'string.pattern.base':
          'Password must include an uppercase letter, a lowercase letter, a number, and a special character.',
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),
};

export const authValidation = {
  register,
  login,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
};
