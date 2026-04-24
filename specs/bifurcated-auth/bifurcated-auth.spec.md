# Specification: Bifurcated Authentication System

## Business Vision

As a user, I want my authentication session to be seamlessly maintained across the application without requiring me to re-enter my credentials, while ensuring that my tokens are protected from common web attack vectors (XSS, CSRF, token theft). If a security breach is detected, all my sessions should be revocable from any device.

---

## Functional Requirements

### FR1: Dual-Token Issuance on Login/Register

- On successful authentication (`/login` or `/register`), the system must issue two tokens:
  - **Access Token (AT)**: A short-lived JWT (15-minute lifespan) returned in the JSON response body.
  - **Refresh Token (RT)**: A long-lived opaque credential (7-day lifespan) delivered exclusively via a `Set-Cookie` header.
- The AT contains the user's `userId` and `username` claims.
- The RT is an opaque, cryptographically random string that is stored hashed in the backend datastore.

### FR2: Secure Client-Side Token Storage

- The AT must **never** be written to `localStorage` or `sessionStorage`. It must exist only in volatile application memory (e.g., a React/Vue state variable or in-memory module scope).
- The AT is intentionally destroyed on browser/tab reload.
- The RT cookie must be configured with: `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: /api/v2/auth`, `maxAge: 7 days`.
- The RT must **never** appear in a JSON response body.

### FR3: Silent Refresh (Transparent Re-authentication)

- When the AT expires and an API request receives a `401 Unauthorized` response, the frontend must **silently** and **automatically** attempt to acquire a new AT by calling `POST /api/v2/auth/refresh`.
- This process must be invisible to the user; the original request must be retried seamlessly with the new AT.
- If the silent refresh itself fails (e.g., RT is also expired or revoked), the user must be redirected to the login screen.

### FR4: Concurrency Control for Refresh

- If multiple API requests fail with `401` simultaneously, only **one** refresh request must be dispatched.
- All other pending requests must queue behind that single refresh attempt and retry once the new AT is available.
- This prevents race conditions and multiple RT rotations in quick succession.

### FR5: Refresh Token Rotation (RTR)

- Every successful refresh must issue a **new** AT and a **new** RT.
- The old RT must be immediately invalidated in the backend datastore.
- This ensures that each RT is single-use, limiting the window for token theft exploitation.

### FR6: Token Family Tracking & Theft Detection

- RTs must be organized into "families" identified by a common `familyId` (generated at login).
- If a previously consumed (invalidated) RT is presented to the `/refresh` endpoint, the system must:
  1. Interpret this as a **token theft event**.
  2. Immediately revoke **all** tokens in that family.
  3. Return a `401 Unauthorized` response, forcing the user to re-authenticate.

### FR7: CSRF Protection on the Refresh Endpoint

- Because the `/refresh` endpoint relies on an automatically attached cookie, it must be protected against Cross-Site Request Forgery (CSRF) attacks.
- The system must use a **stateless HMAC-signed Double-Submit Cookie pattern** (not the deprecated `csurf` library).
- The backend issues a non-`httpOnly` CSRF token cookie.
- The frontend reads this cookie and sends it back as a custom `x-csrf-token` HTTP header.
- The backend validates that the header value matches the cookie value via HMAC verification.

### FR8: Logout (Single Device)

- `POST /api/v2/auth/logout` must:
  1. Clear the RT cookie from the response.
  2. Delete the specific RT record from the backend datastore.
  3. The frontend must clear the in-memory AT.

### FR9: Logout from All Devices (Global Revocation)

- `POST /api/v2/auth/logout-all` must:
  1. Query the backend datastore for all active RT families belonging to the authenticated user.
  2. Delete/invalidate all of them.
  3. Clear the current RT cookie.
  4. The frontend must clear the in-memory AT.
- This effectively forces re-authentication on every active session.

---

## Security Constraints

- **SC1**: ATs must have a strict `exp` claim of 15 minutes. No clock drift tolerance beyond 30 seconds.
- **SC2**: RTs must be opaque strings (not JWTs). They are stored as SHA-256 hashes in the datastore.
- **SC3**: The RT cookie must be scoped to the narrowest path possible (`/api/v2/auth`) to limit its transmission surface.
- **SC4**: CSRF tokens must be HMAC-signed to prevent forgery. The HMAC secret must be distinct from the JWT secret.
- **SC5**: On theft detection (reuse of a consumed RT), all tokens in the compromised family must be invalidated.
- **SC6**: The `Secure` cookie flag ensures RT cookies are only transmitted over HTTPS.
- **SC7**: Password transmission must use RSA-OAEP-256 encryption to prevent MITM attacks (per existing project convention).

---

## Acceptance Criteria

- [ ] Login/register returns AT in JSON body and sets RT as an httpOnly cookie.
- [ ] AT is stored only in volatile memory; it is not readable from `document.cookie`, `localStorage`, or `sessionStorage`.
- [ ] Expired AT triggers a silent refresh that retries the original request transparently.
- [ ] Concurrent 401s result in exactly one refresh request (verified via network inspection).
- [ ] Each successful refresh rotates the RT (old RT is invalidated; new RT is set in cookie).
- [ ] Reusing a consumed RT triggers family-wide revocation and returns 401.
- [ ] The `/refresh` endpoint rejects requests missing a valid `x-csrf-token` header.
- [ ] `POST /logout` clears the RT cookie and deletes the RT from the datastore.
- [ ] `POST /logout-all` invalidates all RT families for the user across all devices.
- [ ] After logout-all, any attempt to refresh from another device returns 401.
