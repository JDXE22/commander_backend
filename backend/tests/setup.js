import 'dotenv/config';

/**
 * Global test setup.
 * Environment variables are loaded from .env (which is git-ignored).
 * If required variables are missing, the application will throw a 
 * Startup Error during module import (see src/config/constants.js).
 */

process.env.NODE_ENV = 'test';

// Only set secrets if they are absolutely required for the test environment 
// to initialize and are not sensitive/production values.
// Otherwise, they should be in .env.
if (!process.env.AT_SECRET) process.env.AT_SECRET = 'test-at-secret-64chars-long-enough-for-hmac-signing-xxxxxxxxxx';
if (!process.env.CSRF_SECRET) process.env.CSRF_SECRET = 'test-csrf-secret-64chars-long-enough-for-hmac-signing-xxxxxxxx';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-jwt-secret';
if (!process.env.GOOGLE_CLIENT_ID) process.env.GOOGLE_CLIENT_ID = 'test-google-id';
if (!process.env.GOOGLE_CLIENT_SECRET) process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
if (!process.env.GOOGLE_CALLBACK_URL) process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/v2/auth/google/callback';
if (!process.env.AT_EXPIRY_SECONDS) process.env.AT_EXPIRY_SECONDS = '3600';
if (!process.env.RT_EXPIRY_SECONDS) process.env.RT_EXPIRY_SECONDS = '604800';
if (!process.env.RT_BYTE_LENGTH) process.env.RT_BYTE_LENGTH = '32';
if (!process.env.RESET_PASSWORD_TOKEN_EXPIRY_MS) process.env.RESET_PASSWORD_TOKEN_EXPIRY_MS = '3600000';

