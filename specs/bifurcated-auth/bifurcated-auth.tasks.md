# Tasks: Bifurcated Authentication System

## Task Breakdown

### Phase 1: Backend Foundation & Dependencies

- [ ] **Task 1.1**: Install new dependencies (`cookie-parser`, `csrf-csrf`, `uuid`).
- [ ] **Task 1.2**: Add new environment variables to `.env` (`AT_SECRET`, `CSRF_SECRET`, `NODE_ENV`, `COOKIE_DOMAIN`).
- [ ] **Task 1.3**: Update `src/config/constants.js` with AT/RT timing constants, cookie names, and cookie path.

### Phase 2: Database Layer

- [ ] **Task 2.1**: Create `src/schemas/mongo-schema/refreshTokenSchema.js` with `tokenHash`, `userId`, `familyId`, `isConsumed`, `expiresAt`, and TTL index.
- [ ] **Task 2.2**: Create `src/models/mongo/refreshTokenModel.js` with methods: `create`, `findByHash`, `consumeByHash`, `revokeFamily`, `revokeAllForUser`, `deleteByHash`.
- [ ] **Task 2.3**: Verify TTL index auto-deletion by creating a test RT with a short `expiresAt` and confirming MongoDB removes it.

### Phase 3: Token Utilities

- [ ] **Task 3.1**: Add `createAccessToken(userId, username)` to `src/utils/auth.js` — signs JWT with `AT_SECRET` and 15m expiry.
- [ ] **Task 3.2**: Add `verifyAccessToken(token)` to `src/utils/auth.js` — verifies JWT with `AT_SECRET`.
- [ ] **Task 3.3**: Add `generateRefreshToken()` to `src/utils/auth.js` — generates a `crypto.randomBytes(48).toString('hex')` opaque string.
- [ ] **Task 3.4**: Create `src/utils/cookies.js` with `setRefreshTokenCookie(res, token)` and `clearRefreshTokenCookie(res)`.

### Phase 4: Middleware

- [ ] **Task 4.1**: Register `cookie-parser` middleware in `src/app.js` before the router.
- [ ] **Task 4.2**: Create `src/middleware/csrfMiddleware.js` configuring `csrf-csrf` with HMAC-signed Double-Submit Cookie pattern.
- [ ] **Task 4.3**: Update `src/middleware/authMiddleware.js` to use `AT_SECRET` (with `JWT_SECRET` fallback for migration).

### Phase 5: Controller Logic

- [ ] **Task 5.1**: Refactor `authController.login` — generate AT via `createAccessToken`, generate RT, create RT record with `familyId` (uuid), set RT cookie, set CSRF cookie, return `{ accessToken }` in body.
- [ ] **Task 5.2**: Refactor `authController.register` — same token issuance logic as login.
- [ ] **Task 5.3**: Implement `authController.refresh` — read RT from cookie, hash it, look up in MongoDB, check `isConsumed` flag, handle theft detection (revoke family), rotate tokens, set new cookies, return new AT.
- [ ] **Task 5.4**: Implement `authController.logout` — read RT from cookie, hash it, delete specific RT record, clear cookies, return success message.
- [ ] **Task 5.5**: Implement `authController.logoutAll` — read `userId` from `req.user`, call `revokeAllForUser(userId)`, clear cookies, return success message.

### Phase 6: Routing

- [ ] **Task 6.1**: Mount `POST /refresh` with `doubleCsrfProtection` middleware (no `authMiddleware`).
- [ ] **Task 6.2**: Mount `POST /logout` with `authMiddleware`.
- [ ] **Task 6.3**: Mount `POST /logout-all` with `authMiddleware`.
- [ ] **Task 6.4**: Add OpenAPI/Swagger JSDoc annotations for all new endpoints.

### Phase 7: Frontend Interceptor Architecture

- [ ] **Task 7.1**: Create `frontend/api/tokenStore.js` — module-scoped `accessToken` variable with `get`, `set`, and `clear` exports.
- [ ] **Task 7.2**: Create `frontend/api/httpClient.js` — Axios instance with `baseURL`, `withCredentials: true`.
- [ ] **Task 7.3**: Implement Request Interceptor — injects `Authorization: Bearer <AT>` from the in-memory store.
- [ ] **Task 7.4**: Implement Response Interceptor with Mutex — catches 401, queues concurrent requests, dispatches single `/refresh` call with CSRF header, retries queued requests.
- [ ] **Task 7.5**: Implement `getCsrfTokenFromCookie()` utility to parse the non-httpOnly `__csrf` cookie.
- [ ] **Task 7.6**: Update login/register frontend handlers to store `accessToken` from response body via `setAccessToken()` (never in localStorage).

### Phase 8: Backend Verification

- [ ] **Task 8.1**: Test login → verify AT in response body and RT in `Set-Cookie` header.
- [ ] **Task 8.2**: Test refresh → verify old RT is consumed, new RT issued in cookie, new AT in body.
- [ ] **Task 8.3**: Test theft detection → use a consumed RT, verify entire family is revoked and 401 is returned.
- [ ] **Task 8.4**: Test CSRF rejection → call `/refresh` without `x-csrf-token` header, verify 403.
- [ ] **Task 8.5**: Test logout → verify RT is deleted from MongoDB and cookie is cleared.
- [ ] **Task 8.6**: Test logout-all → verify all RT records for the user are deleted.
- [ ] **Task 8.7**: Test expired RT → verify 401 is returned and cookie is cleared.

### Phase 9: Frontend Verification

- [ ] **Task 9.1**: Verify AT is not in `localStorage`, `sessionStorage`, or `document.cookie`.
- [ ] **Task 9.2**: Verify silent refresh triggers transparently on 401 (network tab inspection).
- [ ] **Task 9.3**: Verify concurrent 401s result in exactly one `/refresh` network request.
- [ ] **Task 9.4**: Verify page reload clears AT and next API call triggers a silent refresh.
- [ ] **Task 9.5**: Verify failed refresh redirects to `/login`.

### Phase 10: Documentation & Cleanup

- [ ] **Task 10.1**: Update `ARCHITECTURE.md` with new auth flow, token lifecycle, and endpoint summary.
- [ ] **Task 10.2**: Update `README.md` with new environment variable documentation.
- [ ] **Task 10.3**: Document migration path in a `MIGRATION.md` for the `token` → `accessToken` response field change.
