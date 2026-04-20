# Template Search Endpoint - Tasks

## Task Breakdown

### 1. Specification and Contract

- [ ] Task 1.1: Review and approve `template-search.spec.md` requirements with stakeholders.
- [ ] Task 1.2: Finalize route contract (`GET /api/v2/templates/search`) and validation rules for `q` and `limit`.
- [ ] Task 1.3: Confirm response field naming (`content` vs existing model `text`) and document mapping rule.

### 2. API Implementation

- [ ] Task 2.1: Add authenticated route handler for `/api/v2/templates/search` in v2 router.
- [ ] Task 2.2: Implement query parsing and validation (trim, max length, limit bounds).
- [ ] Task 2.3: Implement user-scoped filter using `req.user.userId` only.
- [ ] Task 2.4: Implement command-priority ranking for slash-prefixed queries.
- [ ] Task 2.5: Implement case-insensitive content and command matching.
- [ ] Task 2.6: Return projected suggestion payload (`id`, `name`, `content`, `command`).

### 3. Performance Hardening

- [ ] Task 3.1: Add normalized search fields (`commandLower`, `contentLower/textLower`) in model write paths.
- [ ] Task 3.2: Create compound indexes for user + search fields.
- [ ] Task 3.3: Verify bounded query execution and response sizes under expected load.

### 4. Documentation

- [ ] Task 4.1: Add OpenAPI documentation for the new endpoint.
- [ ] Task 4.2: Add request examples in `backend/api.http` for keyword and command query types.
- [ ] Task 4.3: Update architecture/API summary docs with the new route.

### 5. Testing and Validation

- [ ] Task 5.1: Add integration tests for strict user isolation.
- [ ] Task 5.2: Add integration tests for command-priority behavior on slash input.
- [ ] Task 5.3: Add integration tests for case-insensitive matches.
- [ ] Task 5.4: Add tests for edge cases (empty query, invalid limit, no results).
- [ ] Task 5.5: Validate P95 latency target for autocomplete-like usage.
