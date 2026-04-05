import 'dotenv/config';

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
