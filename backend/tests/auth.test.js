import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { hashToken } from '../src/utils/auth.js';

// --- In-memory mock factories ---

function createMockUserModel() {
  const users = [];
  return {
    _users: users,
    create: vi.fn(async ({ input }) => {
      const user = { _id: `user_${Date.now()}`, ...input };
      users.push(user);
      return user;
    }),
    findOne: vi.fn(async ({ email, username }) => {
      return users.find(
        (u) =>
          (email && u.email === email) || (username && u.username === username),
      );
    }),
    findByEmail: vi.fn(async () => null),
    findById: vi.fn(async (id) => users.find((u) => u._id === id) || null),
  };
}

function createMockRefreshTokenModel() {
  const tokens = [];
  return {
    _tokens: tokens,
    create: vi.fn(async ({ tokenHash, userId, familyId, expiresAt }) => {
      const record = {
        tokenHash,
        userId,
        familyId,
        isConsumed: false,
        expiresAt,
        createdAt: new Date(),
      };
      tokens.push(record);
      return record;
    }),
    findByHash: vi.fn(async (tokenHash) => {
      return tokens.find((t) => t.tokenHash === tokenHash && t.expiresAt > new Date()) || null;
    }),
    consumeByHash: vi.fn(async (tokenHash) => {
      const token = tokens.find(
        (t) => t.tokenHash === tokenHash && !t.isConsumed && t.expiresAt > new Date(),
      );
      if (token) token.isConsumed = true;
      return token || null;
    }),
    revokeFamily: vi.fn(async (familyId) => {
      const remaining = tokens.filter((t) => t.familyId !== familyId);
      const count = tokens.length - remaining.length;
      tokens.length = 0;
      tokens.push(...remaining);
      return { deletedCount: count };
    }),
    revokeAllForUser: vi.fn(async (userId) => {
      const remaining = tokens.filter((t) => t.userId !== userId);
      tokens.length = 0;
      tokens.push(...remaining);
    }),
    deleteByHash: vi.fn(async (tokenHash) => {
      const idx = tokens.findIndex((t) => t.tokenHash === tokenHash);
      if (idx >= 0) tokens.splice(idx, 1);
    }),
  };
}

// --- Helpers ---

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

function parseCookies(res) {
  const cookieHeaders = res.headers['set-cookie'] || [];
  const cookies = {};
  for (const raw of cookieHeaders) {
    if (
      raw.includes('Max-Age=0') ||
      raw.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
    ) {
      continue; // cookie being cleared — treat as absent
    }
    const [nameVal] = raw.split(';');
    const [name, ...rest] = nameVal.split('=');
    cookies[name.trim()] = rest.join('=').trim();
  }
  return cookies;
}

function cookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function registerUser(app, { username, email, password }) {
  const res = await request(app)
    .post('/api/v2/auth/register')
    .send({ username, email, password });
  return res;
}

async function loginUser(app, { email, password }) {
  const res = await request(app)
    .post('/api/v2/auth/login')
    .send({ email, password });
  return res;
}

// --- Tests ---

describe('Bifurcated Auth', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'securepassword123',
  };

  describe('POST /api/v2/auth/register', () => {
    it('should return accessToken in body and set __rt and __csrf cookies', async () => {
      const { app } = buildApp();

      const res = await registerUser(app, testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('username', testUser.username);
      expect(res.body).toHaveProperty('email', testUser.email);

      // No legacy `token` field
      expect(res.body).not.toHaveProperty('token');

      const cookies = parseCookies(res);
      expect(cookies).toHaveProperty('__rt');
      expect(cookies).toHaveProperty('__csrf');
    });

    it('should set __rt cookie with httpOnly and sameSite=Lax (in development)', async () => {
      const { app } = buildApp();

      const res = await registerUser(app, testUser);
      const rtCookie = (res.headers['set-cookie'] || []).find((c) =>
        c.startsWith('__rt='),
      );

      expect(rtCookie).toBeDefined();
      expect(rtCookie).toContain('HttpOnly');
      expect(rtCookie).toContain('SameSite=Lax');
      expect(rtCookie).toContain('Path=/api/v2/auth');
    });

    it('should set __csrf cookie WITHOUT httpOnly', async () => {
      const { app } = buildApp();

      const res = await registerUser(app, testUser);
      const csrfCookie = (res.headers['set-cookie'] || []).find((c) =>
        c.startsWith('__csrf='),
      );

      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).not.toContain('HttpOnly');
    });

    it('should create a refresh token record in the store', async () => {
      const { app, refreshTokenModel } = buildApp();

      await registerUser(app, testUser);

      expect(refreshTokenModel.create).toHaveBeenCalledOnce();
      expect(refreshTokenModel._tokens).toHaveLength(1);
      expect(refreshTokenModel._tokens[0]).toHaveProperty('familyId');
      expect(refreshTokenModel._tokens[0]).toHaveProperty('tokenHash');
    });

    it('should sign AT with AT_SECRET, verifiable by AT_SECRET', async () => {
      const { app } = buildApp();

      const res = await registerUser(app, testUser);
      const decoded = jwt.verify(res.body.accessToken, process.env.AT_SECRET);

      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('username', testUser.username);
    });

    it('should return 500 and set no cookies when RT store create fails', async () => {
      const { app, refreshTokenModel } = buildApp();

      refreshTokenModel.create.mockRejectedValueOnce(new Error('DB write failed'));

      const res = await registerUser(app, testUser);

      expect(res.status).toBe(500);
      const cookies = parseCookies(res);
      expect(cookies).not.toHaveProperty('__rt');
    });
  });

  describe('POST /api/v2/auth/login', () => {
    it('should return accessToken in body and set cookies on valid credentials', async () => {
      const { app, userModel } = buildApp();

      // Pre-seed user
      const passwordHash = await bcrypt.hash(testUser.password, 1);
      userModel._users.push({
        _id: 'user_1',
        username: testUser.username,
        email: testUser.email,
        passwordHash,
      });

      const res = await loginUser(app, {
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).not.toHaveProperty('token');

      const cookies = parseCookies(res);
      expect(cookies).toHaveProperty('__rt');
      expect(cookies).toHaveProperty('__csrf');
    });

    it('should return 401 for wrong password', async () => {
      const { app, userModel } = buildApp();

      const passwordHash = await bcrypt.hash(testUser.password, 1);
      userModel._users.push({
        _id: 'user_1',
        username: testUser.username,
        email: testUser.email,
        passwordHash,
      });

      const res = await loginUser(app, {
        email: testUser.email,
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
    });

    it('should return 500 and set no cookies when RT store create fails', async () => {
      const { app, userModel, refreshTokenModel } = buildApp();

      const passwordHash = await bcrypt.hash(testUser.password, 1);
      userModel._users.push({
        _id: 'user_1',
        username: testUser.username,
        email: testUser.email,
        passwordHash,
      });

      refreshTokenModel.create.mockRejectedValueOnce(new Error('DB write failed'));

      const res = await loginUser(app, {
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(500);
      const cookies = parseCookies(res);
      expect(cookies).not.toHaveProperty('__rt');
    });
  });

  describe('POST /api/v2/auth/refresh', () => {
    let app, userModel, refreshTokenModel;
    let loginCookies;
    let csrfToken;

    beforeEach(async () => {
      ({ app, userModel, refreshTokenModel } = buildApp());

      const passwordHash = await bcrypt.hash(testUser.password, 1);
      userModel._users.push({
        _id: 'user_1',
        username: testUser.username,
        email: testUser.email,
        passwordHash,
      });

      const loginRes = await loginUser(app, {
        email: testUser.email,
        password: testUser.password,
      });

      loginCookies = parseCookies(loginRes);
      csrfToken = loginCookies['__csrf'];
    });

    it('should return new accessToken and rotate RT cookie', async () => {
      const oldRt = loginCookies['__rt'];

      const res = await request(app)
        .post('/api/v2/auth/refresh')
        .set('Cookie', cookieHeader(loginCookies))
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');

      const newCookies = parseCookies(res);
      expect(newCookies).toHaveProperty('__rt');
      expect(newCookies['__rt']).not.toBe(oldRt);
    });

    it('should consume old RT and create new RT in store', async () => {
      await request(app)
        .post('/api/v2/auth/refresh')
        .set('Cookie', cookieHeader(loginCookies))
        .set('x-csrf-token', csrfToken);

      expect(refreshTokenModel.consumeByHash).toHaveBeenCalledOnce();

      // Old one consumed, new one created → 2 total
      expect(refreshTokenModel._tokens).toHaveLength(2);
      expect(refreshTokenModel._tokens[0].isConsumed).toBe(true);
      expect(refreshTokenModel._tokens[1].isConsumed).toBe(false);
    });

    it('should preserve familyId across rotation', async () => {
      await request(app)
        .post('/api/v2/auth/refresh')
        .set('Cookie', cookieHeader(loginCookies))
        .set('x-csrf-token', csrfToken);

      const [oldToken, newToken] = refreshTokenModel._tokens;
      expect(newToken.familyId).toBe(oldToken.familyId);
    });

    it('should reject request without x-csrf-token header (403)', async () => {
      const res = await request(app)
        .post('/api/v2/auth/refresh')
        .set('Cookie', cookieHeader(loginCookies));

      expect(res.status).toBe(403);
    });

    it('should reject request with invalid CSRF token (403)', async () => {
      const res = await request(app)
        .post('/api/v2/auth/refresh')
        .set('Cookie', cookieHeader(loginCookies))
        .set('x-csrf-token', 'forged-token-value');

      expect(res.status).toBe(403);
    });

    it('should reject request without __rt cookie (401)', async () => {
      const res = await request(app)
        .post('/api/v2/auth/refresh')
        .set('Cookie', `__csrf=${csrfToken}`)
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(401);
    });

    describe('Theft detection (consumed RT reuse)', () => {
      it('should revoke entire family when consumed RT is reused', async () => {
        // First refresh — succeeds, consumes old RT
        await request(app)
          .post('/api/v2/auth/refresh')
          .set('Cookie', cookieHeader(loginCookies))
          .set('x-csrf-token', csrfToken);

        // Second refresh — same old RT → theft detected
        const res = await request(app)
          .post('/api/v2/auth/refresh')
          .set('Cookie', cookieHeader(loginCookies))
          .set('x-csrf-token', csrfToken);

        expect(res.status).toBe(401);
        expect(res.body.message).toContain('Token reuse detected');
        expect(refreshTokenModel.revokeFamily).toHaveBeenCalledOnce();
      });
    });

    describe('Token expiration', () => {
      it('AT should expire after configured seconds', async () => {
        const loginRes = await loginUser(app, {
          email: testUser.email,
          password: testUser.password,
        });

        const accessToken = loginRes.body.accessToken;
        const decoded = jwt.decode(accessToken);

        const expirySeconds = parseInt(process.env.AT_EXPIRY_SECONDS, 10);
        const expectedExpiry = decoded.iat + expirySeconds;
        expect(decoded.exp).toBe(expectedExpiry);
      });

      it('should return 401 for expired AT on protected route', async () => {
        // Sign AT that already expired
        const expiredToken = jwt.sign(
          { userId: 'user_1', username: testUser.username },
          process.env.AT_SECRET,
          { expiresIn: -10 },
        );

        const res = await request(app)
          .post('/api/v2/auth/logout')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(res.status).toBe(401);
      });

      it('should reject refresh with unknown RT hash (simulating expired/TTL-deleted RT)', async () => {
        // Clear store to simulate MongoDB TTL deletion
        refreshTokenModel._tokens.length = 0;

        const res = await request(app)
          .post('/api/v2/auth/refresh')
          .set('Cookie', cookieHeader(loginCookies))
          .set('x-csrf-token', csrfToken);

        expect(res.status).toBe(401);
        expect(res.body.message).toContain('Invalid or expired refresh token');
      });

      it('should reject expired RT still present in store and clear cookies', async () => {
        // Back-date the token to simulate TTL delay — record exists but is past expiry
        for (const token of refreshTokenModel._tokens) {
          token.expiresAt = new Date(Date.now() - 1000);
        }

        const res = await request(app)
          .post('/api/v2/auth/refresh')
          .set('Cookie', cookieHeader(loginCookies))
          .set('x-csrf-token', csrfToken);

        expect(res.status).toBe(401);
        expect(res.body.message).toContain('Invalid or expired refresh token');
        const cookies = parseCookies(res);
        expect(cookies).not.toHaveProperty('__rt');
      });
    });

    describe('Concurrency — multiple simultaneous refreshes', () => {
      it('should allow only first refresh to succeed; second sees consumed RT', async () => {
        const makeRefresh = () =>
          request(app)
            .post('/api/v2/auth/refresh')
            .set('Cookie', cookieHeader(loginCookies))
            .set('x-csrf-token', csrfToken);

        // Fire 3 concurrent refreshes with same RT cookie
        const results = await Promise.all([
          makeRefresh(),
          makeRefresh(),
          makeRefresh(),
        ]);

        const statuses = results.map((r) => r.status);
        const successes = statuses.filter((s) => s === 200);
        const theftDetections = statuses.filter((s) => s === 401);

        // Exactly one should succeed
        expect(successes.length).toBe(1);
        // Others should detect reuse
        expect(theftDetections.length).toBe(2);
      });
    });
  });

  describe('POST /api/v2/auth/logout', () => {
    it('should clear RT cookie and delete RT from store', async () => {
      const { app, userModel, refreshTokenModel } = buildApp();

      const passwordHash = await bcrypt.hash(testUser.password, 1);
      userModel._users.push({
        _id: 'user_1',
        username: testUser.username,
        email: testUser.email,
        passwordHash,
      });

      const loginRes = await loginUser(app, {
        email: testUser.email,
        password: testUser.password,
      });

      const cookies = parseCookies(loginRes);
      const accessToken = loginRes.body.accessToken;

      const res = await request(app)
        .post('/api/v2/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookieHeader(cookies));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
      expect(refreshTokenModel.deleteByHash).toHaveBeenCalledOnce();
    });

    it('should return 401 without Authorization header', async () => {
      const { app } = buildApp();

      const res = await request(app).post('/api/v2/auth/logout');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v2/auth/logout-all', () => {
    it('should revoke all RT families for the user', async () => {
      const { app, userModel, refreshTokenModel } = buildApp();

      const passwordHash = await bcrypt.hash(testUser.password, 1);
      userModel._users.push({
        _id: 'user_1',
        username: testUser.username,
        email: testUser.email,
        passwordHash,
      });

      // Login twice to create two families
      const login1 = await loginUser(app, {
        email: testUser.email,
        password: testUser.password,
      });
      const login2 = await loginUser(app, {
        email: testUser.email,
        password: testUser.password,
      });

      expect(refreshTokenModel._tokens).toHaveLength(2);

      const accessToken = login2.body.accessToken;
      const cookies = parseCookies(login2);

      const res = await request(app)
        .post('/api/v2/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookieHeader(cookies));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('All sessions terminated');
      expect(refreshTokenModel.revokeAllForUser).toHaveBeenCalledWith('user_1');
    });

    it('should return 401 without valid AT', async () => {
      const { app } = buildApp();

      const res = await request(app).post('/api/v2/auth/logout-all');

      expect(res.status).toBe(401);
    });
  });
});
