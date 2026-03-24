import 'dotenv/config';
import { AppError } from '../utils/errors.js';

export const PORT = process.env.PORT;
export const URL = process.env.DATABASE_URL;

export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

export const validateSmtpConfig = () => {
  const { host, port, auth } = SMTP_CONFIG;
  const missing = [];

  if (!host) missing.push('SMTP_HOST');
  if (!port || isNaN(port)) missing.push('SMTP_PORT (must be a valid number)');
  if (!auth.user) missing.push('SMTP_USER');
  if (!auth.pass) missing.push('SMTP_PASS');

  if (missing.length > 0) {
    throw new AppError(
      500,
      `SMTP configuration is incomplete or invalid. Missing: ${missing.join(', ')}`,
      'SMTP_CONFIG_ERROR',
    );
  }
};

export const EMAIL_FROM = process.env.EMAIL_FROM;
export const FRONTEND_URL = process.env.FRONTEND_URL;
