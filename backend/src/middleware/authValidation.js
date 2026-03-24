import { BadRequestError } from '../utils/errors.js';
import { MIN_PASSWORD_LENGTH } from '../config/constants.js';

export const validateRegisterInput = (req, res, next) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    throw new BadRequestError('Username, email, and password are required');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
  next();
};

export const validateLoginInput = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new BadRequestError('Username and password are required');
  }
  next();
};

export const validateForgotPasswordInput = (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    throw new BadRequestError('Email is required');
  }
  next();
};

export const validateResetPasswordInput = (req, res, next) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
  next();
};
