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

export const EMAIL_FROM = process.env.EMAIL_FROM;
export const FRONTEND_URL = process.env.FRONTEND_URL;
