import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { getAtExpirySeconds, getRtByteLength } from '../config/constants.js';
import { JWT_SECRET, AT_SECRET } from '../config/config.js';

// --- Legacy v1 token (preserved for backward compatibility) ---

export const createToken = (userId, username) => {
  return jwt.sign({ userId, username }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '1d',
  });
};

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// --- Access Token (v2 bifurcated auth) ---

export const createAccessToken = (userId, username) => {
  return jwt.sign({ userId, username }, AT_SECRET, {
    expiresIn: getAtExpirySeconds(),
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, AT_SECRET);
};

// --- Refresh Token (v2 bifurcated auth) ---

export const generateRefreshToken = () => {
  return crypto.randomBytes(getRtByteLength()).toString('hex');
};
