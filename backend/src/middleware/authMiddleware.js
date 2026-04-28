import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors.js';
import { AT_SECRET } from '../config/config.js';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return next(new UnauthorizedError('Missing authorization header'));
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new UnauthorizedError('Invalid authorization header format'));
  }

  try {
    const decoded = jwt.verify(token, AT_SECRET);
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
    };
    next();
  } catch {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
};
