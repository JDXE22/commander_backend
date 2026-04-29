import { OAuth2Client } from 'google-auth-library';
import crypto from 'node:crypto';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} from '../config/config.js';

let oauthClient = null;

export function getGoogleOAuthClient() {
  if (!oauthClient) {
    oauthClient = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_CALLBACK_URL,
    );
  }
  return oauthClient;
}

export function generateOAuthState() {
  return crypto.randomBytes(32).toString('hex');
}

export function getGoogleAuthUrl(state) {
  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
}

export async function exchangeCodeForProfile(code) {
  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    emailVerified: payload.email_verified,
  };
}
