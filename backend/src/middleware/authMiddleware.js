import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors.js';
import { AT_SECRET } from '../config/config.js';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log(`[Auth] Incoming request: ${req.method} ${req.path}`);
  console.log(`[Auth] Authorization Header: ${authHeader ? 'Present' : 'MISSING'}`);

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
  } catch (err) {
    console.error(`[Auth] 401 Unauthorized: ${err.message}`);
    console.error(`[Auth] Header present: ${!!authHeader}`);
    console.error(`[Auth] Token slice: ${token?.slice(0, 10)}...`);
    console.error(`[Auth] AT_SECRET length: ${AT_SECRET?.length}`);
    return next(new UnauthorizedError('Invalid or expired token'));
  }
};
