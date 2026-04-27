export const SALT_ROUNDS = 10;
export const MIN_PASSWORD_LENGTH = 8;
export const RESET_PASSWORD_TOKEN_EXPIRY_MS = 3600000;

// Token policy — values are runtime-configurable via environment variables
export const getAtExpirySeconds = () =>
  parseInt(process.env.AT_EXPIRY_SECONDS, 10);
export const getRtExpirySeconds = () =>
  parseInt(process.env.RT_EXPIRY_SECONDS, 10);
export const getRtExpiryMs = () => getRtExpirySeconds() * 1000;
export const getRtByteLength = () => parseInt(process.env.RT_BYTE_LENGTH, 10);

// Cookie names and paths
export const RT_COOKIE_NAME = '__rt';
export const RT_COOKIE_PATH = '/api/v2/auth';
export const CSRF_COOKIE_NAME = '__csrf';
