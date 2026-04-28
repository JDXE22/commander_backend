import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  ConflictError,
  UnauthorizedError,
  BadRequestError,
} from '../utils/errors.js';
import { sendResetPasswordEmail } from '../utils/email.js';
import { performPasswordReset } from '../utils/passwordReset.js';
import { FRONTEND_URL } from '../config/config.js';
import {
  createToken,
  hashToken,
  generateRandomToken,
  createAccessToken,
  generateRefreshToken,
} from '../utils/auth.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../utils/cookies.js';
import { generateCsrfToken } from '../middleware/csrfMiddleware.js';
import {
  SALT_ROUNDS,
  RESET_PASSWORD_TOKEN_EXPIRY_MS,
  getRtExpirySeconds,
} from '../config/constants.js';

function formatAuthResponse(user, accessToken) {
  return {
    userId: user._id,
    username: user.username,
    email: user.email,
    accessToken,
  };
}

async function issueTokenPair(req, res, refreshTokenModel, user) {
  const accessToken = createAccessToken(user._id, user.username);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const familyId = uuidv4();
  const expiresAt = new Date(Date.now() + getRtExpirySeconds() * 1000);

  await refreshTokenModel.create({ tokenHash, userId: user._id, familyId, expiresAt });

  setRefreshTokenCookie(res, rawRefreshToken);
  generateCsrfToken(req, res, { overwrite: true });

  return accessToken;
}

export class AuthController {
  constructor({ userModel, refreshTokenModel }) {
    this.userModel = userModel;
    this.refreshTokenModel = refreshTokenModel;
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

      const accessToken = await issueTokenPair(req, res, this.refreshTokenModel, user);
      res.status(201).json(formatAuthResponse(user, accessToken));
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const accessToken = await issueTokenPair(req, res, this.refreshTokenModel, user);
      res.json(formatAuthResponse(user, accessToken));
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req, res, next) => {
    try {
      const rawRefreshToken = req.cookies['__rt'];
      if (!rawRefreshToken) {
        clearRefreshTokenCookie(res);
        throw new UnauthorizedError('Missing refresh token');
      }

      const tokenHash = hashToken(rawRefreshToken);
      const storedToken = await this.refreshTokenModel.findByHash(tokenHash);

      if (!storedToken) {
        clearRefreshTokenCookie(res);
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      if (storedToken.isConsumed) {
        // Consumed token presented again — theft detected, revoke entire family
        await this.refreshTokenModel.revokeFamily(storedToken.familyId);
        clearRefreshTokenCookie(res);
        throw new UnauthorizedError('Token reuse detected. All sessions revoked.');
      }

      // Rotate: consume old token, issue new token pair
      await this.refreshTokenModel.consumeByHash(tokenHash);

      const newRawRefreshToken = generateRefreshToken();
      const newTokenHash = hashToken(newRawRefreshToken);
      const expiresAt = new Date(Date.now() + getRtExpirySeconds() * 1000);

      await this.refreshTokenModel.create({
        tokenHash: newTokenHash,
        userId: storedToken.userId,
        familyId: storedToken.familyId,
        expiresAt,
      });

      const user = { _id: storedToken.userId };
      const accessToken = createAccessToken(storedToken.userId, storedToken.username);

      setRefreshTokenCookie(res, newRawRefreshToken);
      generateCsrfToken(req, res, { overwrite: true });

      res.json({ accessToken });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      const rawRefreshToken = req.cookies['__rt'];
      if (rawRefreshToken) {
        const tokenHash = hashToken(rawRefreshToken);
        await this.refreshTokenModel.deleteByHash(tokenHash);
      }

      clearRefreshTokenCookie(res);
      res.clearCookie('__csrf');
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  };

  logoutAll = async (req, res, next) => {
    try {
      await this.refreshTokenModel.revokeAllForUser(req.user.userId);

      clearRefreshTokenCookie(res);
      res.clearCookie('__csrf');
      res.json({ message: 'All sessions terminated' });
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
      await performPasswordReset(token, newPassword, this.userModel);
      res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      next(error);
    }
  };

  resetPasswordWithBody = async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;
      await performPasswordReset(token, newPassword, this.userModel);
      res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      next(error);
    }
  };
}
