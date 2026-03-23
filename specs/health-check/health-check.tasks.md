# Health Check Endpoint — Tasks

- [x] Create `backend/src/controllers/healthController.js` with `getHealth` handler
- [x] Create `backend/src/router/healthRouter.js` with OpenAPI annotation and route
- [x] Modify `backend/src/app.js` to import and mount `healthRouter` on `/`
- [x] Add health check request to `backend/api.http`
- [x] Update `ARCHITECTURE.md` (project structure, key paths, API summary)
- [x] Fix `swagger.js` to scan `./src/router/*.js` (discovered during verification)
- [x] Manually verify `GET /` returns `200 { "status": "ok" }`
- [x] Verify endpoint appears in Swagger UI at `/api-docs`
