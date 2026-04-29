# Specification: Google OAuth Sign-In

## Business Vision

As a user, I want to sign in to Commander using my Google account so that I don't have to create or remember a separate password. The Google login must integrate seamlessly with the existing bifurcated token architecture (Access Token in-memory, Refresh Token in httpOnly cookie) without weakening any security guarantees. If I already have a local (email + password) account, signing in with Google using the same email should link the accounts, not create a duplicate.

---

## Functional Requirements

### FR1: Google OAuth Initiation

- The application must expose `GET /api/v2/auth/google` which redirects the user to Google's OAuth consent screen.
- The redirect URL must include:
  - `scope`: `openid`, `email`, `profile`
  - `state`: a cryptographically random string for CSRF protection
  - `prompt`: `select_account` (allow multi-account selection)
- Before redirecting, the server must store the `state` value in a short-lived (10-minute) `httpOnly` cookie named `__oauth_state`, scoped to `/api/v2/auth`.

### FR2: Google OAuth Callback

- The application must expose `GET /api/v2/auth/google/callback` to receive the authorization code from Google.
- Upon receiving the callback, the server must:
  1. Validate the `state` query parameter against the `__oauth_state` cookie value.
  2. Exchange the authorization `code` for an ID token via Google's token endpoint.
  3. Extract the user profile (`sub`, `email`, `name`, `picture`, `email_verified`) from the ID token.
  4. Execute the account resolution logic (FR3).
  5. Issue an AT+RT token pair using the existing `issueTokenPair` mechanism.
  6. Redirect the user to `FRONTEND_URL` with no tokens in the URL.

### FR3: Account Resolution & Linking

- On Google callback, the system must resolve the user in this order:
  1. **Find by Google ID** (`googleId` field): if found, proceed to token issuance.
  2. **Find by email**: if a local user with the same email exists, link the Google ID to that user record (update `googleId` field) and proceed.
  3. **Create new user**: if no match is found, create a new user with the Google profile data and no `passwordHash`. Generate a unique username from the email prefix.
- Account linking must be idempotent — linking an already-linked account is a no-op.

### FR4: OAuth CSRF Protection via State Parameter

- Before redirecting to Google, the server must generate a cryptographically random `state` string (32 bytes, hex-encoded).
- The `state` must be stored in an `httpOnly`, `secure` (in production), `sameSite` cookie with a 10-minute max age.
- On callback, the incoming `state` query parameter must exactly match the cookie value.
- If the values do not match or either is missing, the server must reject the request and redirect the user to the frontend login page with an error indicator.
- The `__oauth_state` cookie must be cleared immediately after validation, regardless of outcome.

### FR5: Redirect Problem — Silent Refresh Token Delivery

- The Google callback redirect to the frontend must **not** include the Access Token in the URL (query parameters, fragment, or path).
- The RT cookie and CSRF cookie are set by the callback response (via `Set-Cookie` headers).
- The frontend's existing silent refresh mechanism (`refreshSession()` on initial page load when no AT is in memory) will automatically acquire the initial Access Token.
- This ensures the AT never appears in browser history, server logs, or referrer headers.

### FR6: Mixed Authentication Support

- Users with both a local password and a linked Google ID may authenticate using either method.
- Users who signed up exclusively via Google (no `passwordHash`) must not be able to use the `POST /login` endpoint. The server must return a clear error message directing them to use Google Sign-In.

### FR7: Logout Compatibility

- The existing `POST /api/v2/auth/logout` and `POST /api/v2/auth/logout-all` endpoints must work identically for Google-authenticated sessions.
- No changes to the logout flow are required, as it operates on the RT cookie and RT store, which are provider-agnostic.

### FR8: Graceful Degradation

- If `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not configured in the environment, the Google OAuth routes must not be mounted.
- The rest of the authentication system must continue to function normally without Google OAuth configured.
- The frontend should detect the availability of Google Sign-In and conditionally render the Google button.

---

## Security Constraints

- **SC1**: The `state` parameter must be a cryptographically random string of at least 32 bytes.
- **SC2**: The `__oauth_state` cookie must be `httpOnly` to prevent JavaScript access.
- **SC3**: The authorization code exchange must occur server-side. The frontend never sees the authorization code or Google tokens.
- **SC4**: The Access Token must never appear in any URL (redirect, referrer, or query parameter).
- **SC5**: Google-only users must have `passwordHash` as `null`/`undefined`; the system must not store a dummy password.
- **SC6**: The `googleId` field must have a unique sparse index to prevent duplicate Google accounts while allowing non-Google users.
- **SC7**: All existing security constraints from the bifurcated auth spec (SC1–SC7) remain in full effect.

---

## Acceptance Criteria

- [ ] `GET /api/v2/auth/google` returns a 302 redirect to Google's consent screen with `scope`, `state`, and `prompt` parameters.
- [ ] The `__oauth_state` cookie is set as `httpOnly` with a 10-minute max age before the redirect.
- [ ] `GET /api/v2/auth/google/callback` validates the `state` parameter against the cookie.
- [ ] A mismatched or missing `state` redirects to `FRONTEND_URL/login?error=oauth_failed`.
- [ ] On first Google sign-in, a new user is created with `googleId`, no `passwordHash`, and a generated username.
- [ ] On Google sign-in with an email matching an existing local user, the `googleId` is linked to that user without creating a duplicate.
- [ ] On Google sign-in with an already-linked account, the existing user is found by `googleId` directly.
- [ ] The callback redirect to `FRONTEND_URL` sets the `__rt` and `__csrf` cookies but does not include the AT in the URL.
- [ ] After the redirect, the frontend's silent refresh automatically acquires the AT.
- [ ] A Google-only user attempting `POST /login` with email/password receives a 401 with a descriptive message.
- [ ] `POST /logout` and `POST /logout-all` work correctly for Google-authenticated sessions.
- [ ] If `GOOGLE_CLIENT_ID` is not configured, `GET /api/v2/auth/google` returns 404 (route not mounted).
