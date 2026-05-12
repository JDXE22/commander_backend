import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock googleOAuth module before importing app/controller
const mockGoogleOAuth = {
  generateOAuthState: vi.fn(),
  getGoogleAuthUrl: vi.fn(),
  exchangeCodeForProfile: vi.fn(),
};

vi.mock('../src/utils/googleOAuth.js', () => mockGoogleOAuth);

import { createApp } from '../src/app.js';

// --- Mocks ---

function createMockUserModel() {
  const users = [];
  return {
    _users: users,
    findOne: vi.fn(async ({ email, username }) => {
      return users.find(
        (u) =>
          (email && u.email === email) || (username && u.username === username),
      );
    }),
    findByEmail: vi.fn(
      async (email) => users.find((u) => u.email === email) || null,
    ),
    findById: vi.fn(async (id) => users.find((u) => u._id === id) || null),
    findByGoogleId: vi.fn(
      async (googleId) => users.find((u) => u.googleId === googleId) || null,
    ),
    create: vi.fn(async ({ input }) => {
      const user = { _id: `user_${Date.now()}`, ...input };
      users.push(user);
      return user;
    }),
    linkGoogleId: vi.fn(async (id, googleId) => {
      const user = users.find((u) => u._id === id);
      if (user) user.googleId = googleId;
      return user;
    }),
  };
}

function createMockRefreshTokenModel() {
  const tokens = [];
  return {
    _tokens: tokens,
    create: vi.fn(async (data) => {
      tokens.push(data);
      return data;
    }),
    findByHash: vi.fn(
      async (hash) => tokens.find((t) => t.tokenHash === hash) || null,
    ),
    deleteByHash: vi.fn(async (hash) => {
      const idx = tokens.findIndex((t) => t.tokenHash === hash);
      if (idx >= 0) tokens.splice(idx, 1);
    }),
    revokeAllForUser: vi.fn(async (userId) => {
      const remaining = tokens.filter((t) => t.userId !== userId);
      tokens.length = 0;
      tokens.push(...remaining);
    }),
  };
}

function buildApp() {
  const userModel = createMockUserModel();
  const refreshTokenModel = createMockRefreshTokenModel();
  const app = createApp({
    commandModel: null,
    userModel,
    refreshTokenModel,
  });
  return { app, userModel, refreshTokenModel };
}

describe('Google Auth TDD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v2/auth/google', () => {
    it('should redirect to Google Auth URL and set state cookie', async () => {
      const { app } = buildApp();

      const mockState = 'test-state-123';
      const mockAuthUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?client_id=...&state=' +
        mockState;

      mockGoogleOAuth.generateOAuthState.mockReturnValue(mockState);
      mockGoogleOAuth.getGoogleAuthUrl.mockReturnValue(mockAuthUrl);

      const res = await request(app).get('/api/v2/auth/google');

      expect(res.status).toBe(302);
      expect(res.header.location).toBe(mockAuthUrl);

      const cookies = res.headers['set-cookie'] || [];
      expect(
        cookies.some((c) => c.includes('__oauth_state=test-state-123')),
      ).toBe(true);
    });
  });

  describe('GET /api/v2/auth/google/callback', () => {
    const mockProfile = {
      googleId: 'google-123',
      email: 'google-user@example.com',
      name: 'Google User',
      picture: 'http://pic.com/123',
      emailVerified: true,
    };

    it('should redirect to frontend with tokens on successful new user signup', async () => {
      const { app, userModel } = buildApp();
      const state = 'valid-state';

      mockGoogleOAuth.exchangeCodeForProfile.mockResolvedValue(mockProfile);

      const res = await request(app)
        .get('/api/v2/auth/google/callback')
        .query({ code: 'valid-code', state })
        .set('Cookie', [`__oauth_state=${state}`]);

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('accessToken=');
      expect(res.header.location).toContain('csrfToken=');
      expect(res.header.location).toContain('username=google-user');

      // Verify user was created
      expect(userModel.create).toHaveBeenCalled();
      const createdUser = userModel._users.find(
        (u) => u.email === mockProfile.email,
      );
      expect(createdUser).toBeDefined();
      expect(createdUser.googleId).toBe(mockProfile.googleId);
    });

    it('should redirect with error if state is missing or mismatched', async () => {
      const { app } = buildApp();

      const res = await request(app)
        .get('/api/v2/auth/google/callback')
        .query({ code: 'some-code', state: 'forged-state' })
        .set('Cookie', ['__oauth_state=correct-state']);

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('error=oauth_failed');
    });

    it('should link google account if email already exists without googleId', async () => {
      const { app, userModel } = buildApp();
      const state = 'valid-state';

      // Pre-seed user with same email but no googleId
      userModel._users.push({
        _id: 'user-existing',
        username: 'existinguser',
        email: mockProfile.email,
        passwordHash: 'some-hash',
      });

      mockGoogleOAuth.exchangeCodeForProfile.mockResolvedValue(mockProfile);

      const res = await request(app)
        .get('/api/v2/auth/google/callback')
        .query({ code: 'valid-code', state })
        .set('Cookie', [`__oauth_state=${state}`]);

      expect(res.status).toBe(302);
      expect(userModel.linkGoogleId).toHaveBeenCalled();

      const user = userModel._users.find((u) => u.email === mockProfile.email);
      expect(user.googleId).toBe(mockProfile.googleId);
    });

    it('should login existing user with google account', async () => {
      const { app, userModel } = buildApp();
      const state = 'valid-state';

      // Pre-seed user with googleId
      userModel._users.push({
        _id: 'user-google',
        username: 'googler',
        email: mockProfile.email,
        googleId: mockProfile.googleId,
      });

      mockGoogleOAuth.exchangeCodeForProfile.mockResolvedValue(mockProfile);

      const res = await request(app)
        .get('/api/v2/auth/google/callback')
        .query({ code: 'valid-code', state })
        .set('Cookie', [`__oauth_state=${state}`]);

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('accessToken=');
      expect(userModel.create).not.toHaveBeenCalled();
    });

    it('should redirect with error if exchangeCodeForProfile fails', async () => {
      const { app } = buildApp();
      const state = 'valid-state';

      mockGoogleOAuth.exchangeCodeForProfile.mockRejectedValue(
        new Error('Google API error'),
      );

      const res = await request(app)
        .get('/api/v2/auth/google/callback')
        .query({ code: 'bad-code', state })
        .set('Cookie', [`__oauth_state=${state}`]);

      expect(res.status).toBe(302);
      expect(res.header.location).toContain('error=oauth_failed');
    });
  });
});
