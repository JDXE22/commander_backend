# Health Check Endpoint — Specification

## Overview

Provide a lightweight `GET /` endpoint that immediately confirms the backend service is running and responsive. This endpoint is intended for use by uptime monitors, load balancers, container orchestrators, and developers verifying deployment status.

---

## User Stories

### US-1: Service Availability Check

**As** a DevOps engineer or monitoring service,
**I want** to call `GET /` and receive an instant `200 OK` response,
**So that** I can confirm the backend is up without hitting any database-dependent route.

---

## Functional Requirements

| ID   | Requirement                                                                    |
| ---- | ------------------------------------------------------------------------------ |
| FR-1 | The endpoint **must** be `GET /` (the root path of the server).                |
| FR-2 | The response **must** have HTTP status `200`.                                  |
| FR-3 | The response body **must** be JSON: `{ "status": "ok" }`.                      |
| FR-4 | The endpoint **must not** require authentication.                              |
| FR-5 | The endpoint **must not** depend on the database or any external service.       |
| FR-6 | The endpoint **must** be documented with an OpenAPI `@openapi` JSDoc annotation.|

---

## Acceptance Criteria

- [ ] `GET /` returns `200` with `{ "status": "ok" }`.
- [ ] Response content-type is `application/json`.
- [ ] The endpoint is listed in Swagger UI at `/api-docs`.
- [ ] No database connection is required for the response to succeed.
- [ ] The endpoint is reachable in both Local and MongoDB runtime modes.

---

## Out of Scope

- Detailed health sub-checks (database connectivity, memory, uptime).
- Authentication or rate limiting on this endpoint.
- Readiness vs. liveness probe distinction (future enhancement).
