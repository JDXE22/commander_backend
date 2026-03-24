import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../utils/errors.js';
import { sendResetPasswordEmail } from '../utils/email.js';
import { FRONTEND_URL } from '../config/config.js';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

function validateRegisterInput({ username, email, password }) {
  if (!username || !email || !password) {
    throw new BadRequestError('Username, email, and password are required');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    );
  }
}

function validateLoginInput({ username, password }) {
  if (!username || !password) {
    throw new BadRequestError('Username and password are required');
  }
}

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

  #createToken(userId, username) {
    return jwt.sign({ userId, username }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY || '1d',
    });
  }

  #hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  register = async (req, res, next) => {
    try {
      validateRegisterInput(req.body);

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

      const token = this.#createToken(user._id, user.username);
      res.status(201).json(formatAuthResponse(user, token));
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      validateLoginInput(req.body);

      const { username, password } = req.body;

      const user = await this.userModel.findOne({ username });
      if (!user) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const token = this.#createToken(user._id, user.username);
      res.json(formatAuthResponse(user, token));
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email) {
        throw new BadRequestError('Email is required');
      }

      const user = await this.userModel.findByEmail(email);
      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = this.#hashToken(resetToken);
        const resetExpires = Date.now() + 3600000; // 1 hour

        await this.userModel.updateResetFields(user._id, {
          resetToken: hashedToken,
          resetExpires,
        });

        // We don't await email sending to avoid blocking the response,
        // but in a real prod app we might use a queue.
        sendResetPasswordEmail(user.email, resetToken, FRONTEND_URL).catch(
          console.error,
        );
      }

      // Always return 200 to prevent account enumeration
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

      if (!token) {
        throw new BadRequestError('Reset token is required');
      }

      if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
        throw new BadRequestError(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
        );
      }

      const hashedToken = this.#hashToken(token);

      const user = await this.userModel.findByResetToken(hashedToken);

      if (!user || user.resetPasswordExpires < Date.now()) {
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
