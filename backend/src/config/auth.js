import { betterAuth } from 'better-auth';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  FRONTEND_URL,
} from './config.js';
import { UserModel } from '../models/mongo/userModel.js';
import { RefreshTokenModel } from '../models/mongo/refreshTokenModel.js';
import { issueTokenPair } from '../controllers/authController.js';
import crypto from 'node:crypto';

const userModel = new UserModel();
const refreshTokenModel = new RefreshTokenModel();

async function generateUniqueUsername(email) {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
  let candidate = base;
  let attempts = 0;

  while (attempts < 5) {
    const existing = await userModel.findOne({ username: candidate });
    if (!existing) return candidate;
    candidate = `${base}_${crypto.randomBytes(3).toString('hex')}`;
    attempts++;
  }

  return `user_${crypto.randomBytes(6).toString('hex')}`;
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3015',
  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID || '',
      clientSecret: GOOGLE_CLIENT_SECRET || '',
    },
  },
  database: {
    dialect: 'sqlite',
    type: 'sqlite',
  },
  hooks: {
    after: [
      {
        matcher(context) {
          return context.path.startsWith('/callback/google');
        },
        handler: async (ctx) => {
          try {
            const returned = ctx.context.returned;
            if (!returned || !returned.user) {
              return;
            }

            const profile = returned.user;
            const googleId = profile.id;
            const email = profile.email;

            let user = await userModel.findByGoogleId(googleId);

            if (!user) {
              user = await userModel.findOne({ email });
              if (user) {
                user = await userModel.linkGoogleId(user._id, googleId);
              } else {
                const username = await generateUniqueUsername(email);
                user = await userModel.create({
                  input: {
                    username,
                    email,
                    googleId,
                  },
                });
              }
            }

            const req = ctx.context.request;
            const res = ctx.context.responseHeaders;
          } catch (error) {
            console.error('Google OAuth Hook Error:', error);
          }
        },
      },
    ],
  },
});
