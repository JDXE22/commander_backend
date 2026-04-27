# Technical Plan: Bifurcated Authentication System

## Architecture & Design

- **Backend Stack**: Node.js, Express 5.1, Mongoose (MongoDB), `jsonwebtoken`, `cookie-parser`, `csrf-csrf`.
- **Frontend Stack**: JavaScript (React/Vue), Axios HTTP client with interceptors.
- **Communication**: REST API over HTTPS.
- **Token Storage (Backend)**: MongoDB collection `refresh_tokens` for RT persistence and family tracking.

---

## 1. New Dependencies

| Package | Purpose | Version |
|---|---|---|
| `cookie-parser` | Parse `Cookie` headers so Express can read the RT cookie | `^1.4.7` |
| `csrf-csrf` | Stateless HMAC-signed Double-Submit Cookie CSRF protection | `^3.x` |
| `uuid` | Generate unique `familyId` and `jti` identifiers for RT families | `^11.x` |

> **Note**: `jsonwebtoken`, `crypto`, `bcrypt` are already installed. No additional JWT library is needed.

---

## 2. Environment Variable Additions

| Variable | Description | Example |
|---|---|---|
| `AT_SECRET` | HMAC secret for signing Access Tokens (replaces generic `JWT_SECRET` for ATs) | `<64-char hex>` |
| `RT_BYTE_LENGTH` | Byte length for opaque RT generation | `48` |
| `CSRF_SECRET` | HMAC secret for CSRF token signing (must differ from `AT_SECRET`) | `<64-char hex>` |
| `COOKIE_DOMAIN` | Domain for cookie scoping in production | `.commander.app` |
| `NODE_ENV` | Controls `Secure` cookie flag (`production` = true) | `production` |

> **Backward Compatibility**: `JWT_SECRET` remains for legacy v1 token verification during migration. New AT signing uses `AT_SECRET`.

### Updated `config/constants.js`

```js
export const AT_EXPIRY_SECONDS = 900;       // 15 minutes
export const RT_EXPIRY_SECONDS = 604800;    // 7 days
export const RT_EXPIRY_MS = RT_EXPIRY_SECONDS * 1000;
export const RT_BYTE_LENGTH = 48;
export const CSRF_COOKIE_NAME = '__csrf';
export const RT_COOKIE_NAME = '__rt';
export const RT_COOKIE_PATH = '/api/v2/auth';
```

---

## 3. Database Schema Changes

### 3a. New Mongoose Schema: `refreshTokenSchema.js`

**Location**: `src/schemas/mongo-schema/refreshTokenSchema.js`

```js
import mongoose from 'mongoose';

export const refreshTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    index: true,
  },
  familyId: {
    type: String,
    required: true,
    index: true,
  },
  isConsumed: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL auto-cleanup
  },
}, { timestamps: true });
```

**Key Design Decisions**:
- `tokenHash`: SHA-256 hash of the opaque RT. The plaintext is never stored.
- `familyId`: Groups all RTs from the same login session. Used for theft detection.
- `isConsumed`: Marks an RT as "used" after rotation. If a consumed RT is presented again → theft.
- `expiresAt` with TTL index: MongoDB automatically deletes expired documents, eliminating the need for manual cleanup cron jobs.

### 3b. No Changes to `userSchema.js`

The user schema remains unchanged. RT families are tracked in a separate collection, keeping the user document lean.

---

## 4. New Model: `RefreshTokenModel`

**Location**: `src/models/mongo/refreshTokenModel.js`

| Method | Signature | Purpose |
|---|---|---|
| `create` | `({ tokenHash, userId, familyId, expiresAt })` | Persist a new RT record |
| `findByHash` | `(tokenHash)` | Look up an RT by its hash |
| `consumeByHash` | `(tokenHash)` | Set `isConsumed = true` on the given RT |
| `revokeFamily` | `(familyId)` | Delete all RTs sharing the same `familyId` |
| `revokeAllForUser` | `(userId)` | Delete all RTs for a given user (global logout) |
| `deleteByHash` | `(tokenHash)` | Delete a specific RT (single logout) |

---

## 5. Updated `utils/auth.js`

### New Exports

```js
// --- Access Token ---
export const createAccessToken = (userId, username) => {
  return jwt.sign({ userId, username }, process.env.AT_SECRET, {
    expiresIn: AT_EXPIRY_SECONDS,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.AT_SECRET);
};

// --- Refresh Token ---
export const generateRefreshToken = () => {
  return crypto.randomBytes(RT_BYTE_LENGTH).toString('hex');
};
```

> **Note**: The existing `createToken` and `hashToken` functions are preserved for backward compatibility with v1 routes and password reset flows.

---

## 6. New Utility: `utils/cookies.js`

**Location**: `src/utils/cookies.js`

Centralizes all cookie configuration to prevent duplication and ensure consistency.

```js
import { RT_COOKIE_NAME, RT_COOKIE_PATH, RT_EXPIRY_MS } from '../config/constants.js';

export const setRefreshTokenCookie = (res, token) => {
  res.cookie(RT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: RT_COOKIE_PATH,
    maxAge: RT_EXPIRY_MS,
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie(RT_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: RT_COOKIE_PATH,
  });
};
```

---

## 7. API Contracts

All new endpoints are mounted under `/api/v2/auth`.

### 7a. `POST /api/v2/auth/login` (Modified)

**Request**: `{ email: string, password: string }`

**Response (200)**:
```json
{
  "userId": "...",
  "username": "...",
  "email": "...",
  "accessToken": "<jwt>"
}
```

**Side Effects**:
- Sets `__rt` cookie with the new RT (httpOnly, secure, strict).
- Sets `__csrf` cookie with the HMAC-signed CSRF token (non-httpOnly).
- Creates a new RT record in MongoDB with a new `familyId`.

> **Breaking Change**: The response field changes from `token` → `accessToken`. Frontend must be updated.

### 7b. `POST /api/v2/auth/register` (Modified)

Same response shape and side effects as login.

### 7c. `POST /api/v2/auth/refresh` (New)

**Request**: No JSON body. The RT is sent automatically via the `__rt` cookie.

**Required Headers**: `x-csrf-token: <csrf_token_value>`

**Response (200)**:
```json
{
  "accessToken": "<new_jwt>"
}
```

**Side Effects**:
- Validates the incoming RT cookie hash against MongoDB.
- If valid and **not consumed**: marks old RT as consumed, generates new RT, sets new cookie.
- If valid but **already consumed** (theft detected): revokes entire family, clears cookie, returns 401.
- If expired or not found: returns 401, clears cookie.

**Error Responses**:
- `401`: Invalid/expired RT, consumed RT (theft), missing CSRF token.
- `403`: CSRF validation failure.

### 7d. `POST /api/v2/auth/logout` (New)

**Required**: Valid AT in `Authorization` header.

**Response (200)**:
```json
{
  "message": "Logged out successfully"
}
```

**Side Effects**:
- Deletes the specific RT record from MongoDB (by cookie hash).
- Clears the `__rt` cookie.
- Clears the `__csrf` cookie.

### 7e. `POST /api/v2/auth/logout-all` (New)

**Required**: Valid AT in `Authorization` header.

**Response (200)**:
```json
{
  "message": "All sessions terminated"
}
```

**Side Effects**:
- Deletes **all** RT records for the user's `userId` from MongoDB.
- Clears the `__rt` cookie.
- Clears the `__csrf` cookie.

---

## 8. CSRF Protection Strategy

### Library: `csrf-csrf`

**Configuration** (`src/middleware/csrfMiddleware.js`):

```js
import { doubleCsrf } from 'csrf-csrf';

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: false,       // Frontend must read this cookie
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

export { doubleCsrfProtection, generateToken };
```

**Application**:
- `doubleCsrfProtection` middleware is applied **only** to the `/refresh` endpoint.
- `generateToken` is called during `/login` and `/register` to set the initial CSRF cookie.

---

## 9. Middleware Changes

### 9a. Updated `authMiddleware.js`

- Replace `process.env.JWT_SECRET` with `process.env.AT_SECRET` for AT verification.
- Keep backward compatibility: if `AT_SECRET` is not set, fall back to `JWT_SECRET`.

### 9b. New: `cookie-parser` Registration

In `app.js`, add `app.use(cookieParser())` **before** the router middleware so `req.cookies` is populated.

---

## 10. Controller Changes: `authController.js`

### Modified Methods

| Method | Changes |
|---|---|
| `login` | Generate AT via `createAccessToken`, generate RT, create RT record with new `familyId`, set RT cookie, set CSRF cookie, return `accessToken` in body (not `token`). |
| `register` | Same changes as `login`. |

### New Methods

| Method | Endpoint | Logic |
|---|---|---|
| `refresh` | `POST /refresh` | Read RT from cookie → hash → look up in MongoDB → if consumed: revoke family, return 401 → if valid: consume old RT, generate new RT+AT, set new cookies, return new AT. |
| `logout` | `POST /logout` | Read RT from cookie → hash → delete from MongoDB → clear cookies → return success. |
| `logoutAll` | `POST /logout-all` | Read `userId` from `req.user` (via authMiddleware) → delete all RTs for that userId → clear cookies → return success. |

---

## 11. Router Changes: `router.js`

New routes under the `v2AuthRouter`:

```js
// CSRF-protected refresh (no authMiddleware — uses RT cookie)
v2AuthRouter.post('/refresh', doubleCsrfProtection, authController.refresh);

// Auth-required logout routes
v2AuthRouter.post('/logout', authMiddleware, authController.logout);
v2AuthRouter.post('/logout-all', authMiddleware, authController.logoutAll);
```

---

## 12. Frontend Interceptor Architecture

### 12a. Axios Instance Configuration

```js
const api = axios.create({
  baseURL: '/api/v2',
  withCredentials: true, // Ensures cookies are sent cross-origin
});
```

### 12b. In-Memory Token Store

```js
let accessToken = null;

export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => { accessToken = null; };
```

> **Critical**: This module-scoped variable is destroyed on page reload. This is intentional — the user will silently re-authenticate via the RT cookie on the next API call.

### 12c. Request Interceptor

```js
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 12d. Response Interceptor with Mutex

```js
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request behind the in-flight refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const csrfToken = getCsrfTokenFromCookie();
        const { data } = await axios.post('/api/v2/auth/refresh', null, {
          withCredentials: true,
          headers: { 'x-csrf-token': csrfToken },
        });

        setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

### 12e. CSRF Token Reader

```js
function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/(^|;)\s*__csrf=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : '';
}
```

> The `__csrf` cookie is non-`httpOnly`, so JavaScript can read it. The `__rt` cookie is `httpOnly` and invisible to JS — exactly as intended.

---

## 13. Token Lifecycle Flow Diagrams

### 13a. Login Flow

```
Client                          Server                         MongoDB
  |-- POST /login {email,pass} -->|                               |
  |                               |-- Validate credentials ------>|
  |                               |<-- User record ---------------|
  |                               |-- Generate AT (JWT, 15m) ---->|
  |                               |-- Generate RT (opaque) ------>|
  |                               |-- SHA-256(RT) → store ------->|-- INSERT refresh_tokens
  |                               |-- Generate familyId --------->|   { tokenHash, userId,
  |                               |                               |     familyId, expiresAt }
  |<-- 200 { accessToken } -------|                               |
  |<-- Set-Cookie: __rt=<RT> -----|                               |
  |<-- Set-Cookie: __csrf=<T> ----|                               |
  |                               |                               |
  |-- Store AT in memory only --->|                               |
```

### 13b. Silent Refresh Flow

```
Client                          Server                         MongoDB
  |-- GET /commands (AT expired)->|                               |
  |<-- 401 Unauthorized ----------|                               |
  |                               |                               |
  |-- POST /refresh ------------->|                               |
  |   Cookie: __rt=<old_RT>       |                               |
  |   x-csrf-token: <csrf>        |                               |
  |                               |-- CSRF validate (HMAC) ------>|
  |                               |-- SHA-256(old_RT) ----------->|
  |                               |-- Lookup tokenHash ---------->|-- FIND refresh_tokens
  |                               |<-- Record (isConsumed=false) -|
  |                               |-- Mark old RT consumed ------>|-- UPDATE isConsumed=true
  |                               |-- Generate new RT ----------->|
  |                               |-- SHA-256(new_RT) → store --->|-- INSERT refresh_tokens
  |                               |-- Generate new AT (15m) ----->|
  |<-- 200 { accessToken } -------|                               |
  |<-- Set-Cookie: __rt=<new_RT> -|                               |
  |                               |                               |
  |-- Retry original GET /commands with new AT -->                |
```

### 13c. Theft Detection Flow

```
Attacker                        Server                         MongoDB
  |-- POST /refresh ------------->|                               |
  |   Cookie: __rt=<stolen_RT>    |                               |
  |                               |-- SHA-256(stolen_RT) -------->|
  |                               |-- Lookup tokenHash ---------->|-- FIND refresh_tokens
  |                               |<-- Record (isConsumed=TRUE) --|
  |                               |                               |
  |                               |   ⚠️ THEFT DETECTED           |
  |                               |                               |
  |                               |-- revokeFamily(familyId) ---->|-- DELETE ALL in family
  |<-- 401 { error: THEFT } ------|                               |
  |<-- Clear-Cookie: __rt --------|                               |
```

---

## 14. Security Considerations

| Threat | Mitigation |
|---|---|
| **XSS** steals AT | AT is only in volatile JS memory — no `localStorage`/`sessionStorage`. XSS can still read memory, but the 15m lifespan limits damage. |
| **XSS** steals RT | RT is in an `httpOnly` cookie — inaccessible to `document.cookie` or JS. |
| **CSRF** on `/refresh` | Double-Submit Cookie pattern via `csrf-csrf`. Attacker cannot read the `__csrf` cookie from a different origin. |
| **RT Theft** | Refresh Token Rotation + Family Tracking. Reuse of a consumed RT triggers family-wide revocation. |
| **MITM** | `Secure` cookie flag (HTTPS only). Password encrypted via RSA-OAEP-256 per project convention. |
| **Token Replay** | 15m AT lifespan. Single-use RTs via consumption tracking. |

---

## 15. Migration Strategy

This is a **breaking change** for the v2 authentication flow. The migration path:

1. **Phase 1**: Deploy backend changes. The `/login` and `/register` endpoints return `accessToken` (new) alongside `token` (legacy) temporarily.
2. **Phase 2**: Deploy frontend changes with the new interceptor architecture.
3. **Phase 3**: Remove the legacy `token` field from responses. Remove `JWT_SECRET` fallback in `authMiddleware.js`.

---

## 16. File Change Summary

| File | Action | Purpose |
|---|---|---|
| `package.json` | MODIFY | Add `cookie-parser`, `csrf-csrf`, `uuid` |
| `src/config/constants.js` | MODIFY | Add AT/RT timing constants, cookie names |
| `src/schemas/mongo-schema/refreshTokenSchema.js` | NEW | Mongoose schema for RT storage |
| `src/models/mongo/refreshTokenModel.js` | NEW | Data access layer for RT CRUD + family ops |
| `src/utils/auth.js` | MODIFY | Add `createAccessToken`, `verifyAccessToken`, `generateRefreshToken` |
| `src/utils/cookies.js` | NEW | Cookie set/clear helpers |
| `src/middleware/csrfMiddleware.js` | NEW | `csrf-csrf` configuration and exports |
| `src/middleware/authMiddleware.js` | MODIFY | Use `AT_SECRET` for verification |
| `src/controllers/authController.js` | MODIFY | Refactor login/register; add refresh/logout/logoutAll |
| `src/router/router.js` | MODIFY | Mount `/refresh`, `/logout`, `/logout-all` |
| `src/app.js` | MODIFY | Register `cookie-parser` middleware |
| `.env` | MODIFY | Add `AT_SECRET`, `CSRF_SECRET`, `NODE_ENV` |
| `frontend/api/httpClient.js` | NEW | Axios instance with interceptors (frontend) |
| `frontend/api/tokenStore.js` | NEW | In-memory AT store (frontend) |
