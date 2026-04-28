import 'dotenv/config';
import { AppError } from '../utils/errors.js';

export const PORT = process.env.PORT;
export const URL = process.env.DATABASE_URL;

export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false,
  requireTLS: true,
  logger: true,
  debug: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

export const validateSmtpConfig = () => {
  const { host, port, auth } = SMTP_CONFIG;

  const rules = [
    {
      isValid: !!host,
      label: 'SMTP_HOST',
    },
    {
      isValid: Number.isInteger(port) && port >= 1 && port <= 65535,
      label: 'SMTP_PORT (integer between 1 and 65535)',
    },
    {
      isValid: !!auth.user,
      label: 'SMTP_USER',
    },
    {
      isValid: !!auth.pass,
      label: 'SMTP_PASS',
    },
  ];

  const missingFields = rules
    .filter((rule) => !rule.isValid)
    .map((rule) => rule.label);

  if (missingFields.length > 0) {
    throw new AppError(
      500,
      `SMTP configuration is incomplete or invalid. Missing: ${missingFields.join(', ')}`,
      'SMTP_CONFIG_ERROR',
    );
  }
};

export const EMAIL_FROM = process.env.EMAIL_FROM;
export const FRONTEND_URL = process.env.FRONTEND_URL;

export const JWT_SECRET = process.env.JWT_SECRET;
export const AT_SECRET = process.env.AT_SECRET || process.env.JWT_SECRET;
export const CSRF_SECRET = process.env.CSRF_SECRET;

const requiredEnvVars = [
  { value: AT_SECRET, name: 'AT_SECRET (or JWT_SECRET)' },
  { value: CSRF_SECRET, name: 'CSRF_SECRET' },
  { value: FRONTEND_URL, name: 'FRONTEND_URL' },
];

for (const { value, name } of requiredEnvVars) {
  if (!value) {
    throw new Error(`Startup Error: ${name} must be set in environment variables.`);
  }
}

if (FRONTEND_URL === '*') {
  throw new Error(
    'Startup Error: FRONTEND_URL cannot be "*" when credentials are enabled. Provide an explicit origin.',
  );
}
