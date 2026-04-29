# Tasks: Google OAuth Sign-In

## Phase 1 — Foundation (Config & Schema)

- [ ] **T1.1**: Install `google-auth-library@10.6.2`
  - `npm install google-auth-library@10.6.2`
  - Verify in `package.json` that the exact version is pinned.

- [ ] **T1.2**: Add Google OAuth env vars to `backend/.env.example`
  - Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` with placeholder values.

- [ ] **T1.3**: Export Google config from `src/config/config.js`
  - Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` exports.
  - Do NOT add these to `requiredEnvVars` — they must be optional.

- [ ] **T1.4**: Add OAuth state constants to `src/config/constants.js`
  - Add `OAUTH_STATE_COOKIE_NAME = '__oauth_state'`.
  - Add `OAUTH_STATE_MAX_AGE_MS = 600_000`.

- [ ] **T1.5**: Update `src/schemas/mongo-schema/userSchema.js`
  - Add `googleId` field: `{ type: String, unique: true, sparse: true, index: true }`.
  - Change `passwordHash` to conditionally required: `required: function () { return !this.googleId; }`.

- [ ] **T1.6**: Add new methods to `src/models/mongo/userModel.js`
  - Add `findByGoogleId(googleId)` method.
  - Add `linkGoogleId(userId, googleId)` method.

### Phase 1 Verification
- [ ] Run `npm test` — all existing tests must pass (no regressions from schema changes).
- [ ] Verify `node src/mongo-db.js` boots without errors (Google env vars are present).

---

## Phase 2 — OAuth Utility

- [ ] **T2.1**: Create `src/utils/googleOAuth.js`
  - Implement `getGoogleOAuthClient()` — lazy singleton `OAuth2Client`.
  - Implement `generateOAuthState()` — `crypto.randomBytes(32).toString('hex')`.
  - Implement `getGoogleAuthUrl(state)` — generates Google consent URL with correct scopes.
  - Implement `exchangeCodeForProfile(code)` — exchanges code, verifies ID token, returns profile object.

### Phase 2 Verification
- [ ] Unit test: `generateOAuthState()` returns a 64-character hex string.
- [ ] Unit test: `getGoogleAuthUrl(state)` returns a URL containing `accounts.google.com`, the state parameter, and the required scopes.

---

## Phase 3 — Controller Methods

- [ ] **T3.1**: Add `generateUniqueUsername` private helper to `authController.js`
  - Extract email prefix, sanitize non-alphanumeric characters.
  - Retry with random suffix on collision (up to 5 attempts).
  - Fallback to fully random `user_<hex>` on exhaustion.

- [ ] **T3.2**: Add `googleRedirect` method to `AuthController`
  - Generate state via `generateOAuthState()`.
  - Set `__oauth_state` cookie (httpOnly, secure in production, 10-minute max age, `/api/v2/auth` path).
  - Redirect to the Google authorization URL.

- [ ] **T3.3**: Add `googleCallback` method to `AuthController`
  - Validate `state` query param against `__oauth_state` cookie.
  - Clear `__oauth_state` cookie immediately.
  - On state mismatch: redirect to `FRONTEND_URL/login?error=oauth_failed`.
  - Exchange code for Google profile via `exchangeCodeForProfile`.
  - Execute account resolution: findByGoogleId → findOne({email}) → create.
  - Call `issueTokenPair` to set RT + CSRF cookies.
  - Redirect to `FRONTEND_URL` (no AT in URL).
  - Wrap entire handler in try/catch — on any error, redirect to error URL.

- [ ] **T3.4**: Guard `login` method against Google-only users
  - After finding user by email and before `bcrypt.compare`, check if `user.passwordHash` is falsy.
  - If no passwordHash: throw `UnauthorizedError('This account uses Google Sign-In...')`.

### Phase 3 Verification
- [ ] Run `npm test` — existing auth tests must still pass.

---

## Phase 4 — Route Wiring

- [ ] **T4.1**: Mount Google OAuth routes in `src/router/router.js`
  - Import `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` from config.
  - Inside the `isV2 && userModel` block, conditionally mount:
    - `GET /google` → `authController.googleRedirect`
    - `GET /google/callback` → `authController.googleCallback`
  - Add OpenAPI `@openapi` JSDoc annotations for both routes.

### Phase 4 Verification
- [ ] Run `npm test` — all tests pass.
- [ ] Start the server and verify `GET /api/v2/auth/google` returns a 302 redirect.

---

## Phase 5 — Tests

- [ ] **T5.1**: Add Google OAuth tests to `tests/auth.test.js`
  - Mock `exchangeCodeForProfile` at the module level.
  - **Test: `googleRedirect` sets `__oauth_state` cookie and redirects to Google**
    - Verify 302 status.
    - Verify `Location` header contains `accounts.google.com`.
    - Verify `__oauth_state` cookie is set with `HttpOnly`.
  - **Test: `googleCallback` creates new user on first Google sign-in**
    - Set `__oauth_state` cookie, send matching `state` query param.
    - Mock profile returns a new email/googleId.
    - Verify redirect to `FRONTEND_URL`.
    - Verify `__rt` cookie is set (token pair issued).
    - Verify new user created with `googleId` and no `passwordHash`.
  - **Test: `googleCallback` links Google ID to existing local user**
    - Pre-seed a local user with email + passwordHash.
    - Mock profile returns the same email.
    - Verify `linkGoogleId` was called.
    - Verify no duplicate user created.
  - **Test: `googleCallback` finds existing Google-linked user**
    - Pre-seed a user with `googleId`.
    - Mock profile returns the same `googleId`.
    - Verify user is found directly (no email lookup, no creation).
  - **Test: `googleCallback` rejects mismatched state**
    - Set cookie state to `aaa`, send query state `bbb`.
    - Verify redirect to `FRONTEND_URL/login?error=oauth_failed`.
    - Verify no cookies set, no user created.
  - **Test: `googleCallback` rejects missing state cookie**
    - Send `state` query param but no cookie.
    - Verify redirect to error URL.
  - **Test: `login` rejects Google-only user with clear error message**
    - Pre-seed user with `googleId` and no `passwordHash`.
    - Attempt `POST /login` with email + any password.
    - Verify 401 with message about Google Sign-In.

### Phase 5 Verification
- [ ] Run `npm test` — all tests pass including new Google OAuth suite.

---

## Phase 6 — Documentation

- [ ] **T6.1**: Update `ARCHITECTURE.md`
  - Add Google OAuth routes to the API Summary table.
  - Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` to the Configuration table.
  - Note the `googleId` field in Security Notes.

- [ ] **T6.2**: Update `.env.example`
  - Ensure Google OAuth section is present with descriptive comments.

---

## Phase 7 — Final Verification

- [ ] Run full test suite: `npm test` — zero failures.
- [ ] Start the server locally and perform a manual end-to-end Google sign-in flow:
  1. Navigate to `GET /api/v2/auth/google` in the browser.
  2. Complete Google consent.
  3. Verify redirect to `FRONTEND_URL`.
  4. Verify RT and CSRF cookies are set.
  5. Verify silent refresh acquires AT.
- [ ] Test account linking: register with email/password, then sign in with Google using same email.
- [ ] Test Google-only user cannot use password login.
- [ ] Test logout works for Google-authenticated sessions.
