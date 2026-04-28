export const SALT_ROUNDS = 10;
export const MIN_PASSWORD_LENGTH = 8;
export const getResetPasswordTokenExpiryMs = () =>
  getRequiredIntEnv('RESET_PASSWORD_TOKEN_EXPIRY_MS');

// Helper to ensure numeric environment variables are present and valid
/**
 * Retrieves a required integer environment variable.
 * Throws a startup error if the variable is missing or non-numeric.
 *
 * @param {string} key - The environment variable name.
 * @returns {number} The parsed integer value.
 * @throws {Error} If the environment variable is invalid or missing.
 */
function getRequiredIntEnv(key) {
  const value = process.env[key];
  const parsedValue = parseInt(value, 10);

  if (isNaN(parsedValue)) {
    throw new Error(
      `Startup Error: Environment variable ${key} is required and must be a valid integer.`,
    );
  }

  return parsedValue;
}

export const getAtExpirySeconds = () => getRequiredIntEnv('AT_EXPIRY_SECONDS');
export const getRtExpirySeconds = () => getRequiredIntEnv('RT_EXPIRY_SECONDS');
export const getRtExpiryMs = () => getRtExpirySeconds() * 1000;
export const getRtByteLength = () => getRequiredIntEnv('RT_BYTE_LENGTH');

getAtExpirySeconds();
getRtExpirySeconds();
getRtByteLength();
getResetPasswordTokenExpiryMs();

// Cookie names and paths
export const RT_COOKIE_NAME = '__rt';
export const RT_COOKIE_PATH = '/api/v2/auth';
export const CSRF_COOKIE_NAME = '__csrf';
