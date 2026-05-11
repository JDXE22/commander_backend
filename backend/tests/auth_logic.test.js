import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app.js';

vi.mock('../src/middleware/csrfMiddleware.js', () => ({
  doubleCsrfProtection: vi.fn((req, res, next) => next()),
  generateCsrfToken: vi.fn(() => 'test-csrf-token'),
}));

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
    findByEmail: vi.fn(async (email) => users.find((u) => u.email === email) || null),
    findById: vi.fn(async (id) => users.find((u) => u._id === id) || null),
    create: vi.fn(async ({ input }) => {
      const user = { _id: `user_${Date.now()}`, ...input };
      users.push(user);
      return user;
    }),
  };
}

function createMockRefreshTokenModel() {
  const tokens = [];
  return {
    _tokens: tokens,
    create: vi.fn(async (data) => {
      const token = { ...data, isConsumed: false };
      tokens.push(token);
      return token;
    }),
    findByHash: vi.fn(async (hash) => tokens.find((t) => t.tokenHash === hash) || null),
    consumeByHash: vi.fn(async (hash) => {
      const token = tokens.find((t) => t.tokenHash === hash && !t.isConsumed);
      if (token) {
        token.isConsumed = true;
        return true;
      }
      return false;
    }),
    revokeFamily: vi.fn(async (familyId) => {
      const remaining = tokens.filter((t) => t.familyId !== familyId);
      tokens.length = 0;
      tokens.push(...remaining);
    }),
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

describe('Auth Core Logic TDD', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
  };

  describe('POST /api/v2/auth/register', () => {
    it('should register a new user successfully', async () => {
      const { app, userModel } = buildApp();
      const res = await request(app)
        .post('/api/v2/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.email).toBe(testUser.email);
      expect(userModel.create).toHaveBeenCalled();
    });

    it('should fail if user already exists', async () => {
      const { app, userModel } = buildApp();
      userModel._users.push({ ...testUser, passwordHash: 'hash' });

      const res = await request(app)
        .post('/api/v2/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
    });

    it('should fail if password is too short', async () => {
      const { app } = buildApp();
      const res = await request(app)
        .post('/api/v2/auth/register')
        .send({ ...testUser, password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 8 characters');
    });

    it('should fail if fields are missing', async () => {
      const { app } = buildApp();
      const res = await request(app)
        .post('/api/v2/auth/register')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v2/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const { app, userModel } = buildApp();
      const passwordHash = await bcrypt.hash(testUser.password, 1);
      userModel._users.push({ ...testUser, passwordHash });

      const res = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should fail with invalid email', async () => {
      const { app, userModel } = buildApp();
      const passwordHash = await bcrypt.hash(testUser.password, 1);
      userModel._users.push({ ...testUser, passwordHash });

      const res = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'nonexistent@example.com', password: testUser.password });

      expect(res.status).toBe(401);
    });

    it('should fail with invalid password', async () => {
      const { app, userModel } = buildApp();
      const passwordHash = await bcrypt.hash(testUser.password, 1);
      userModel._users.push({ ...testUser, passwordHash });

      const res = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should fail if account only uses Google Sign-In', async () => {
      const { app, userModel } = buildApp();
      // No passwordHash means Google Auth only
      userModel._users.push({ 
        username: 'googleuser', 
        email: 'google@example.com', 
        googleId: 'g-123' 
      });

      const res = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'google@example.com', password: 'any' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Google Sign-In');
    });
  });

  describe('POST /api/v2/auth/logout', () => {
    it('should logout and clear cookies', async () => {
      const { app, refreshTokenModel } = buildApp();
      
      // Logout requires authentication (AT)
      const accessToken = 'fake-at';
      vi.mock('../src/utils/auth.js', async () => {
        const actual = await vi.importActual('../src/utils/auth.js');
        return {
          ...actual,
          verifyAccessToken: vi.fn(() => ({ userId: 'user_1', username: 'test' })),
        };
      });

      // Wait, mocking verifyAccessToken globally might be tricky. 
      // Instead, let's use a real-looking AT if we can, or just mock the middleware if possible.
      // Actually, createApp uses authMiddleware.
      
      // Let's use jwt.sign to create a valid AT for the test
      const jwt = (await import('jsonwebtoken')).default;
      const at = jwt.sign({ userId: 'user_1', username: 'test' }, process.env.AT_SECRET);

      const res = await request(app)
        .post('/api/v2/auth/logout')
        .set('Authorization', `Bearer ${at}`)
        .set('Cookie', ['__rt=some-token']);

      expect(res.status).toBe(200);
      expect(refreshTokenModel.deleteByHash).toHaveBeenCalled();
      
      const cookies = res.headers['set-cookie'] || [];
      expect(cookies.some(c => c.includes('__rt=;'))).toBe(true);
    });
  });

  describe('POST /api/v2/auth/refresh', () => {
    it('should rotate refresh token successfully', async () => {
      const { app, userModel, refreshTokenModel } = buildApp();
      userModel._users.push({ _id: 'user_1', username: 'test', email: 'test@test.com' });
      
      // Need a valid RT hash in store
      const oldRt = 'old-rt';
      const crypto = await import('node:crypto');
      const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
      const oldHash = hashToken(oldRt);
      
      refreshTokenModel._tokens.push({
        tokenHash: oldHash,
        userId: 'user_1',
        familyId: 'fam_1',
        expiresAt: new Date(Date.now() + 10000),
        isConsumed: false
      });

      const res = await request(app)
        .post('/api/v2/auth/refresh')
        .set('Cookie', [`__rt=${oldRt}`])
        .set('x-csrf-token', 'any'); // CSRF check might fail if not mocked or configured correctly

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(refreshTokenModel.consumeByHash).toHaveBeenCalledWith(oldHash);
      
      const cookies = res.headers['set-cookie'] || [];
      expect(cookies.some(c => c.includes('__rt='))).toBe(true);
      expect(cookies.some(c => c.includes(oldRt))).toBe(false);
    });

    it('should fail if refresh token is missing', async () => {
      const { app } = buildApp();
      const res = await request(app).post('/api/v2/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('should detect reuse and revoke family', async () => {
      const { app, userModel, refreshTokenModel } = buildApp();
      userModel._users.push({ _id: 'user_1', username: 'test', email: 'test@test.com' });
      
      const reusedRt = 'reused-rt';
      const crypto = await import('node:crypto');
      const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
      const reusedHash = hashToken(reusedRt);
      
      refreshTokenModel._tokens.push({
        tokenHash: reusedHash,
        userId: 'user_1',
        familyId: 'fam_1',
        expiresAt: new Date(Date.now() + 10000),
        isConsumed: true // ALREADY CONSUMED
      });

      const res = await request(app)
        .post('/api/v2/auth/refresh')
        .set('Cookie', [`__rt=${reusedRt}`]);

      expect(res.status).toBe(401);
      expect(refreshTokenModel.revokeFamily).toHaveBeenCalledWith('fam_1');
    });
  });

  describe('POST /api/v2/auth/logout-all', () => {
    it('should revoke all tokens for user', async () => {
      const { app, refreshTokenModel } = buildApp();
      
      const jwt = (await import('jsonwebtoken')).default;
      const at = jwt.sign({ userId: 'user_1', username: 'test' }, process.env.AT_SECRET);

      const res = await request(app)
        .post('/api/v2/auth/logout-all')
        .set('Authorization', `Bearer ${at}`);

      expect(res.status).toBe(200);
      expect(refreshTokenModel.revokeAllForUser).toHaveBeenCalledWith('user_1');
    });
  });
});
