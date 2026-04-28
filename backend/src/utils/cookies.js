import {
  RT_COOKIE_NAME,
  RT_COOKIE_PATH,
  getRtExpiryMs,
} from '../config/constants.js';
import { FRONTEND_URL } from '../config/config.js';

const isSecure = () => FRONTEND_URL?.startsWith('https://');

export const setRefreshTokenCookie = (res, token) => {
  res.cookie(RT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: isSecure() ? 'none' : 'lax',
    path: RT_COOKIE_PATH,
    maxAge: getRtExpiryMs(),
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie(RT_COOKIE_NAME, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: isSecure() ? 'none' : 'lax',
    path: RT_COOKIE_PATH,
  });
};
