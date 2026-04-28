import bcrypt from 'bcrypt';
import { BadRequestError } from './errors.js';
import { hashToken } from './auth.js';
import {
  SALT_ROUNDS,
  getResetPasswordTokenExpiryMs,
} from '../config/constants.js';

/**
 * Performs password reset validation and update
 * @param {string} token - The reset token
 * @param {string} newPassword - The new password
 * @param {object} userModel - The user model instance
 * @throws {BadRequestError} If token is invalid, expired, or password requirements not met
 */
export const performPasswordReset = async (token, newPassword, userModel) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new BadRequestError('Password reset token is required');
  }

  const hashedToken = hashToken(token);
  const user = await userModel.findByResetToken(hashedToken);

  const isInvalidToken = !user || user.resetPasswordExpires < Date.now();
  if (isInvalidToken) {
    throw new BadRequestError('Password reset token is invalid or has expired');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userModel.updatePassword(user._id, passwordHash);
};
