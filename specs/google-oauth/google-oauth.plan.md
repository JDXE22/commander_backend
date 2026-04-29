# Technical Plan: Google OAuth Sign-In

## Architecture & Design

- **Backend Stack**: Node.js, Express 5.1, Mongoose (MongoDB), `google-auth-library` 10.6.2.
- **OAuth Flow**: Authorization Code Grant (server-side). No implicit/client-side token exchange.
- **Integration Point**: Extends the existing bifurcated auth system. Reuses `issueTokenPair`, `setRefreshTokenCookie`, `generateCsrfToken`, and all existing token infrastructure.
- **No Passport.js**: Direct use of `google-auth-library`'s `OAuth2Client` to keep the architecture clean, avoid middleware abstraction overhead, and maintain consistency with the existing controller/middleware pattern.

---

## 1. New Dependencies

| Package | Purpose | Version |
|---|---|---|
| `google-auth-library` | Google OAuth2 client — authorization URL generation, code exchange, ID token verification | `10.6.2` |

> **Note**: No other new dependencies are required. `crypto` (Node.js built-in) provides `randomBytes` for state generation.

---

## 2. Environment Variable Additions

| Variable | Description | Example |
|---|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console | `1075758720254-*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console | `GOCSPX-*` |
| `GOOGLE_CALLBACK_URL` | Full callback URL registered in Google Console | `https://api.commander.app/api/v2/auth/google/callback` |

> **Optional at startup**: The application boots normally without these variables. Google OAuth routes are simply not mounted (graceful degradation).

---

## 3. Configuration Changes

### 3a. `src/config/config.js`

Export three new optional environment variables:

```js
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
```

These are intentionally **not** added to the `requiredEnvVars` array — the app must not crash without them.

### 3b. `src/config/constants.js`

Add state cookie constants:

```js
export const OAUTH_STATE_COOKIE_NAME = '__oauth_state';
export const OAUTH_STATE_MAX_AGE_MS = 600_000; // 10 minutes
```

---

## 4. Database Schema Changes

### 4a. Modified `userSchema.js`

Add `googleId` field:

```js
googleId: {
  type: String,
  unique: true,
  sparse: true,  // Allows multiple null/undefined values without index conflicts
  index: true,
},
```

Relax `passwordHash` requirement:

```js
passwordHash: {
  type: String,
  required: function () {
    return !this.googleId; // Only required when no Google ID is present
  },
},
```

**Design Rationale**:
- `sparse: true` + `unique: true` ensures only one user per Google ID while allowing non-Google users to have `googleId: undefined`.
- The conditional `required` function uses Mongoose's `this` context (document being validated) to enforce that at least one auth method exists.

### 4b. No Changes to `refreshTokenSchema.js`

The RT system is provider-agnostic. No schema modifications needed.

---

## 5. Model Changes

### `src/models/mongo/userModel.js`

Two new methods:

| Method | Signature | Purpose |
|---|---|---|
| `findByGoogleId` | `(googleId)` | Locate user by Google `sub` claim |
| `linkGoogleId` | `(userId, googleId)` | Attach Google ID to existing local user |

```js
findByGoogleId = async (googleId) => {
  return userMongooseModel.findOne({ googleId });
};

linkGoogleId = async (userId, googleId) => {
  return userMongooseModel.findByIdAndUpdate(
    userId,
    { googleId },
    { new: true },
  );
};
```

---

## 6. New Utility: `src/utils/googleOAuth.js`

Encapsulates all Google OAuth interactions:

```js
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
```

**Key Design Decisions**:
- Lazy singleton `OAuth2Client` — created on first use, reused across requests.
- `exchangeCodeForProfile` combines code exchange + ID token verification in one call. The `verifyIdToken` step cryptographically verifies the token signature against Google's public keys.
- Returns a clean profile object, decoupled from Google's raw payload.

---

## 7. Controller Changes: `authController.js`

### New Private Helper: `generateUniqueUsername`

```js
async function generateUniqueUsername(profile, userModel) {
  const base = profile.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
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
```

### New Method: `googleRedirect`

Endpoint: `GET /api/v2/auth/google`

```js
googleRedirect = async (req, res, next) => {
  try {
    const state = generateOAuthState();

    res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: isProduction() ? 'none' : 'lax',
      maxAge: OAUTH_STATE_MAX_AGE_MS,
      path: '/api/v2/auth',
    });

    const authUrl = getGoogleAuthUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
};
```

### New Method: `googleCallback`

Endpoint: `GET /api/v2/auth/google/callback`

```js
googleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const storedState = req.cookies[OAUTH_STATE_COOKIE_NAME];

    // 1. Validate state (OAuth CSRF protection)
    if (!state || !storedState || state !== storedState) {
      res.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: '/api/v2/auth' });
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }

    res.clearCookie(OAUTH_STATE_COOKIE_NAME, { path: '/api/v2/auth' });

    // 2. Exchange code for Google profile
    const profile = await exchangeCodeForProfile(code);

    // 3. Account resolution
    let user = await this.userModel.findByGoogleId(profile.googleId);

    if (!user) {
      user = await this.userModel.findOne({ email: profile.email });
      if (user) {
        user = await this.userModel.linkGoogleId(user._id, profile.googleId);
      } else {
        const username = await generateUniqueUsername(profile, this.userModel);
        user = await this.userModel.create({
          input: {
            username,
            email: profile.email,
            googleId: profile.googleId,
          },
        });
      }
    }

    // 4. Issue token pair (RT cookie + CSRF cookie)
    await issueTokenPair(req, res, this.refreshTokenModel, user);

    // 5. Redirect to frontend — silent refresh will acquire AT
    res.redirect(FRONTEND_URL);
  } catch (error) {
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
};
```

### Modified Method: `login`

Add a guard against Google-only users (no password):

```js
// After finding user by email, before bcrypt.compare:
if (!user.passwordHash) {
  throw new UnauthorizedError(
    'This account uses Google Sign-In. Please use the Google button to log in.'
  );
}
```

---

## 8. Router Changes: `router.js`

Conditionally mount Google OAuth routes within the existing `v2AuthRouter` block:

```js
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '../config/config.js';

// Inside the isV2 block:
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  v2AuthRouter.get('/google', authController.googleRedirect);
  v2AuthRouter.get('/google/callback', authController.googleCallback);
}
```

With OpenAPI annotations for both routes.

---

## 9. OAuth Flow Diagrams

### 9a. First-Time Google Sign-In (New User)

```
Frontend                         Backend                            Google
  |                                |                                   |
  |-- Click "Sign in with Google"  |                                   |
  |-- GET /api/v2/auth/google ---->|                                   |
  |                                |-- Generate state (32 bytes) ----->|
  |                                |-- Set __oauth_state cookie        |
  |<-- 302 → accounts.google.com  |                                   |
  |                                                                    |
  |-- User selects account ------->|                                   |
  |                                |<-- 302 /callback?code&state ------|
  |                                |                                   |
  |                                |-- Validate state vs cookie        |
  |                                |-- POST /token (exchange code)     |
  |                                |-- verifyIdToken (signature check) |
  |                                |-- findByGoogleId → null           |
  |                                |-- findOne({ email }) → null       |
  |                                |-- Create new user (no password)   |
  |                                |-- issueTokenPair (RT+CSRF cookies)|
  |<-- 302 → FRONTEND_URL --------|                                   |
  |                                                                    |
  |-- (Page loads, no AT in memory)                                    |
  |-- silentRefresh() → POST /refresh                                  |
  |<-- 200 { accessToken } --------|                                   |
  |                                                                    |
  |-- ✅ User is authenticated     |                                   |
```

### 9b. Account Linking (Existing Local User)

```
Frontend                         Backend                            Google
  |-- GET /api/v2/auth/google ---->|                                   |
  |<-- 302 → Google consent -------|                                   |
  |-- User consents -------------->|<-- 302 /callback?code&state ------|
  |                                |                                   |
  |                                |-- Validate state ✓                |
  |                                |-- exchangeCodeForProfile          |
  |                                |-- findByGoogleId → null           |
  |                                |-- findOne({ email }) → FOUND      |
  |                                |-- linkGoogleId(userId, googleId)  |
  |                                |-- issueTokenPair                  |
  |<-- 302 → FRONTEND_URL --------|                                   |
```

### 9c. OAuth CSRF Attack (Rejected)

```
Attacker crafts malicious link:
  /api/v2/auth/google/callback?code=ATTACKER_CODE&state=FORGED

Victim clicks link:
  Backend reads __oauth_state cookie → value does not match FORGED state
  Backend clears cookie → redirects to /login?error=oauth_failed
  ❌ Attack prevented
```

---

## 10. Security Considerations

| Threat | Mitigation |
|---|---|
| **OAuth CSRF** (attacker-supplied code) | `state` parameter + httpOnly cookie comparison. Attacker cannot read victim's cookie. |
| **Token leakage via URL** | AT is never in the redirect URL. RT is in httpOnly cookie. |
| **Code interception** | Authorization code is single-use and exchanged server-side within seconds. |
| **Account takeover via email** | Google ID takes precedence in lookup. Email linking only occurs on first Google sign-in. |
| **Google-only user password brute-force** | `login` endpoint rejects users without `passwordHash` before any bcrypt operation. |
| **Duplicate Google accounts** | `unique: true` + `sparse: true` index on `googleId` field. |

---

## 11. File Change Summary

| File | Action | Purpose |
|---|---|---|
| `backend/package.json` | MODIFY | Add `google-auth-library` 10.6.2 |
| `backend/.env.example` | MODIFY | Add Google OAuth env vars |
| `backend/src/config/config.js` | MODIFY | Export `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| `backend/src/config/constants.js` | MODIFY | Add `OAUTH_STATE_COOKIE_NAME`, `OAUTH_STATE_MAX_AGE_MS` |
| `backend/src/schemas/mongo-schema/userSchema.js` | MODIFY | Add `googleId` (unique, sparse), relax `passwordHash` |
| `backend/src/models/mongo/userModel.js` | MODIFY | Add `findByGoogleId`, `linkGoogleId` |
| `backend/src/utils/googleOAuth.js` | NEW | OAuth2 client, state generation, code exchange |
| `backend/src/controllers/authController.js` | MODIFY | Add `googleRedirect`, `googleCallback`, guard `login` |
| `backend/src/router/router.js` | MODIFY | Mount Google OAuth GET routes (conditional) |
| `ARCHITECTURE.md` | MODIFY | Document new Google OAuth routes |
