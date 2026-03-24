import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export const createToken = (userId, username) => {
  return jwt.sign({ userId, username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '1d',
  });
};

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
