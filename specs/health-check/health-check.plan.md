# Health Check Endpoint — Technical Plan

## Architecture Alignment

The codebase follows a **factory-pattern** (`createApp`) in `app.js`, with routes mounted via `app.use()`. The health check is a simple, stateless route that should be registered directly in `app.js` before any prefixed routers, since it lives at the root path `/` and has no model dependency.

### Stack

- **Runtime**: Node.js, plain JavaScript (ES modules)
- **Framework**: Express 5.1.0
- **Documentation**: Swagger via `swagger-jsdoc` + `swagger-ui-express`

---

## Proposed Changes

### 1. `backend/src/controllers/healthController.js` — **[NEW]**

Create a thin controller exporting a single handler function:

```js
/**
 * @desc    Health check — confirms the service is running
 * @route   GET /
 */
export const getHealth = (req, res) => {
  res.status(200).json({ status: 'ok' });
};
```

- Synchronous — no `try/catch` or `next(error)` needed.
- No model or service dependency.

### 2. `backend/src/router/healthRouter.js` — **[NEW]**

Define a dedicated router with the OpenAPI JSDoc annotation:

```js
import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';

export const healthRouter = () => {
  const router = Router();

  /**
   * @openapi
   * /:
   *   get:
   *     summary: Health check
   *     ...
   */
  router.get('/', getHealth);

  return router;
};
```

### 3. `backend/src/app.js` — **[MODIFY]**

- Import `healthRouter`.
- Mount it **before** the `/api/commands` router: `app.use('/', healthRouter());`

### 4. `backend/api.http` — **[MODIFY]**

Add a manual test entry at the top:

```http
### Health Check
GET http://localhost:1234/
```

### 5. `ARCHITECTURE.md` — **[MODIFY]**

- Add `GET /` row to the **API Summary** table.
- Add `healthController.js` and `healthRouter.js` to the **Project Structure** tree and **Key Paths** table.

---

## API Contract

| Method | Path | Auth | Status | Body                    |
| ------ | ---- | ---- | ------ | ----------------------- |
| GET    | `/`  | None | 200    | `{ "status": "ok" }`   |

---

## Verification Plan

### Manual Verification

1. Start the server in **local mode**: `npm run local` (from `backend/`).
2. Send `GET http://localhost:1234/` using the REST Client extension (the entry in `api.http`).
3. Confirm response is `200 OK` with body `{ "status": "ok" }` and content-type `application/json`.
4. Open `http://localhost:1234/api-docs` and verify the `GET /` endpoint appears in the Swagger UI under a "Health" tag.

> **Note**: The project currently has **no automated test framework** configured (no Jest/Vitest, no test files). Setting up a test runner is out of scope for this task. Verification will be manual via `api.http`.
