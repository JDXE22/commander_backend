import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
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
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../utils/cookies.js';
import { generateCsrfToken } from '../middleware/csrfMiddleware.js';
import {
  SALT_ROUNDS,
  getRtExpirySeconds,
  getResetPasswordTokenExpiryMs,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_MS,
} from '../config/constants.js';
import {
  generateOAuthState,
  getGoogleAuthUrl,
  exchangeCodeForProfile,
} from '../utils/googleOAuth.js';

const isProduction = () => process.env.NODE_ENV === 'production';

async function generateUniqueUsername(profile, userModel) {
  const base = profile.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
  let candidate = base;
  let attempts = 0;

  while (attempts < 5) {
    const existing = await userModel.findOne({ username: candidate });
    if (!existing) return candidate;
    candidate = `${base}_${crypto.randomBytes(3).toString('hex')}`;
    attempts++;
  }

  return `user_${crypto.randomBytes(6).toString('hex')}`;
}

function formatAuthResponse(user, accessToken, csrfToken) {
  return {
    userId: user._id,
    username: user.username,
    email: user.email,
    accessToken,
    csrfToken,
  };
}

export async function issueTokenPair(req, res, refreshTokenModel, user) {
  const accessToken = createAccessToken(user._id, user.username);
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const familyId = uuidv4();
  const expiresAt = new Date(Date.now() + getRtExpirySeconds() * 1000);

  await refreshTokenModel.create({
    tokenHash,
    userId: user._id,
    familyId,
    expiresAt,
  });

  setRefreshTokenCookie(res, rawRefreshToken);
  const csrfToken = generateCsrfToken(req, res, { overwrite: true });

  return { accessToken, csrfToken };
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

      const { accessToken, csrfToken } = await issueTokenPair(
        req,
        res,
        this.refreshTokenModel,
        user,
      );
      res.status(201).json(formatAuthResponse(user, accessToken, csrfToken));
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

      if (!user.passwordHash) {
        throw new UnauthorizedError(
          'This account uses Google Sign-In. Please use the Google button to log in.',
        );
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const { accessToken, csrfToken } = await issueTokenPair(
        req,
        res,
        this.refreshTokenModel,
        user,
      );
      res.json(formatAuthResponse(user, accessToken, csrfToken));
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

      if (storedToken.expiresAt < new Date()) {
        clearRefreshTokenCookie(res);
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      if (storedToken.isConsumed) {
        // Consumed token presented again — theft detected, revoke entire family
        await this.refreshTokenModel.revokeFamily(storedToken.familyId);
        clearRefreshTokenCookie(res);
        throw new UnauthorizedError(
          'Token reuse detected. All sessions revoked.',
        );
      }

      // Atomically consume — guard against concurrent requests racing past the isConsumed check
      const consumed = await this.refreshTokenModel.consumeByHash(tokenHash);
      if (!consumed) {
        await this.refreshTokenModel.revokeFamily(storedToken.familyId);
        clearRefreshTokenCookie(res);
        throw new UnauthorizedError(
          'Token reuse detected. All sessions revoked.',
        );
      }

      const newRawRefreshToken = generateRefreshToken();
      const newTokenHash = hashToken(newRawRefreshToken);
      const expiresAt = new Date(Date.now() + getRtExpirySeconds() * 1000);

      await this.refreshTokenModel.create({
        tokenHash: newTokenHash,
        userId: storedToken.userId,
        familyId: storedToken.familyId,
        expiresAt,
      });

      const user = await this.userModel.findById(storedToken.userId);
      if (!user) {
        clearRefreshTokenCookie(res);
        throw new UnauthorizedError('User not found');
      }
      const accessToken = createAccessToken(user._id, user.username);

      setRefreshTokenCookie(res, newRawRefreshToken);

      const csrfToken = generateCsrfToken(req, res, { overwrite: true });
      res.json(formatAuthResponse(user, accessToken, csrfToken));
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
        const resetExpires = Date.now() + getResetPasswordTokenExpiryMs();

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

  googleRedirect = async (req, res, next) => {
    try {
      const state = generateOAuthState();

      res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
        httpOnly: true,
        secure: isProduction(),
        sameSite: isProduction() ? 'none' : 'lax',
        maxAge: OAUTH_STATE_MAX_AGE_MS,
        path: '/api/v2/auth',
      });

      const authUrl = getGoogleAuthUrl(state);
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  };

  googleCallback = async (req, res, next) => {
    try {
      const { code, state } = req.query;
      const storedState = req.cookies[OAUTH_STATE_COOKIE_NAME];

      res.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: '/api/v2/auth' });

      if (!state || !storedState || state !== storedState) {
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
      }

      const profile = await exchangeCodeForProfile(code);

      let user = await this.userModel.findByGoogleId(profile.googleId);

      if (!user) {
        user = await this.userModel.findOne({ email: profile.email });
        if (user) {
          user = await this.userModel.linkGoogleId(user._id, profile.googleId);
        } else {
          const username = await generateUniqueUsername(profile, this.userModel);
          user = await this.userModel.create({
            input: {
              username,
              email: profile.email,
              googleId: profile.googleId,
            },
          });
        }
      }

      const { accessToken, csrfToken } = await issueTokenPair(req, res, this.refreshTokenModel, user);

      const params = new URLSearchParams({
        accessToken,
        csrfToken,
        userId: String(user._id),
        username: user.username,
        email: user.email,
      });
      res.redirect(`${FRONTEND_URL}?${params}`);
    } catch (error) {
      res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }
  };
}
