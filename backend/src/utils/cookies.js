import { RT_COOKIE_NAME, RT_COOKIE_PATH, getRtExpiryMs } from '../config/constants.js';

const isProduction = () => process.env.NODE_ENV === 'production';

export const setRefreshTokenCookie = (res, token) => {
  res.cookie(RT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: RT_COOKIE_PATH,
    maxAge: getRtExpiryMs(),
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie(RT_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: RT_COOKIE_PATH,
  });
};
