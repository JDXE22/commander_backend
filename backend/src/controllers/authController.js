import bcrypt from 'bcrypt';
import {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
} from '../utils/errors.js';
import { sendResetPasswordEmail } from '../utils/email.js';
import { FRONTEND_URL } from '../config/config.js';
import { createToken, hashToken, generateRandomToken } from '../utils/auth.js';
import {
  SALT_ROUNDS,
  RESET_PASSWORD_TOKEN_EXPIRY_MS,
} from '../config/constants.js';

function formatAuthResponse(user, token) {
  return {
    userId: user._id,
    username: user.username,
    email: user.email,
    token,
  };
}

export class AuthController {
  constructor({ userModel }) {
    this.userModel = userModel;
  }

  register = async (req, res, next) => {
    try {
      const { username, email, password } = req.body;

      const existingUser = await this.userModel.findOne({ username, email });
      if (existingUser) {
        const isSameUsername =
          existingUser.username.localeCompare(username, undefined, {
            sensitivity: 'base',
          }) === 0;
        const field = isSameUsername ? 'Username' : 'Email';
        throw new ConflictError(`${field} is already taken`);
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await this.userModel.create({
        input: { username, email, passwordHash },
      });

      const token = createToken(user._id, user.username);
      res.status(201).json(formatAuthResponse(user, token));
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const { username, password } = req.body;

      const user = await this.userModel.findOne({ username });
      if (!user) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const token = createToken(user._id, user.username);
      res.json(formatAuthResponse(user, token));
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await this.userModel.findByEmail(email);

      if (user) {
        const resetToken = generateRandomToken();
        const hashedToken = hashToken(resetToken);
        const resetExpires = Date.now() + RESET_PASSWORD_TOKEN_EXPIRY_MS;

        await this.userModel.updateResetFields(user._id, {
          resetToken: hashedToken,
          resetExpires,
        });

        sendResetPasswordEmail(user.email, resetToken, FRONTEND_URL).catch(
          console.error,
        );
      }

      res.json({
        message:
          'If an account exists for this email, you will receive a reset link shortly.',
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const { token } = req.params;
      const { newPassword } = req.body;

      const hashedToken = hashToken(token);
      const user = await this.userModel.findByResetToken(hashedToken);

      const isInvalidToken = !user || user.resetPasswordExpires < Date.now();
      if (isInvalidToken) {
        throw new BadRequestError(
          'Password reset token is invalid or has expired',
        );
      }

      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await this.userModel.updatePassword(user._id, passwordHash);

      res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      next(error);
    }
  };
}
