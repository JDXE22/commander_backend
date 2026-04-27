import { doubleCsrf } from 'csrf-csrf';
import { CSRF_COOKIE_NAME } from '../config/constants.js';

const isProduction = () => process.env.NODE_ENV === 'production';

export const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: () => '',
  cookieName: CSRF_COOKIE_NAME,
  cookieOptions: {
    httpOnly: false, // frontend must read this cookie to send in x-csrf-token header
    secure: isProduction(),
    sameSite: 'strict',
    path: '/',
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
});
