import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors.js';

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
    const secret = process.env.AT_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
    };
    next();
  } catch {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
};
