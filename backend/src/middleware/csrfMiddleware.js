import { doubleCsrf } from 'csrf-csrf';
import { CSRF_COOKIE_NAME } from '../config/constants.js';
import { FRONTEND_URL } from '../config/config.js';

const isSecure = () => FRONTEND_URL?.startsWith('https://');

export const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: () => '',
  cookieName: CSRF_COOKIE_NAME,
  cookieOptions: {
    httpOnly: false, // frontend must read this cookie to send in x-csrf-token header
    secure: isSecure(),
    sameSite: isSecure() ? 'none' : 'lax',
    path: '/',
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
});
