# Implementation Checklist: Commander v2

**Status:** Ready to Start  
**Estimated Timeline:** 6-7 weeks  
**Team Size:** 2-3 developers recommended

---

## 🔧 Phase 1: Setup & Infrastructure (Weeks 1-2)

### Database Models & Schemas

- [ ] **Task 1.1 - Create User Model**
  - File: `backend/src/models/mongo/userModel.js`
  - Include: username, email, passwordHash, timestamps, isActive, isMigrationUser
  - Export User model for use in controllers
  - Estimated time: 2-3 hours

- [ ] **Task 1.2 - Create User Schema**
  - File: `backend/src/schemas/mongo-schema/userSchema.js`
  - Validation: min username length 3, email format, password hash required
  - Indexes: unique on username, unique on email
  - Estimated time: 1-2 hours

- [ ] **Task 1.3 - Update Command Schema**
  - File: `backend/src/schemas/mongo-schema/commandSchema.js`
  - Add: userId (ObjectId, ref: User), createdAt, updatedAt
  - Indexes: composite (userId, command) unique, userId ascending
  - Remove or keep backwards compatibility for v1
  - Estimated time: 2-3 hours

- [ ] **Task 1.4 - Update Command Model**
  - File: `backend/src/models/mongo/commandModel.js`
  - Ensure timestamps are enabled
  - Estimated time: 1 hour

### Environment & Configuration

- [ ] **Task 1.5 - Update .env Configuration**
  - Add: `JWT_SECRET=<random-secret-string>`
  - Add: `JWT_EXPIRY=7d`
  - Add: `API_VERSION=both` (for dev/staging)
  - Add: `API_SUFFIX=/api/v2` (optional, can stay /api/v2)
  - Estimated time: 30 mins

- [ ] **Task 1.6 - Create .env.example**
  - Document all required environment variables for v2
  - Include defaults and description
  - Estimated time: 30 mins

### Dependencies

- [ ] **Task 1.7 - Install Required Packages**
  ```bash
  npm install jsonwebtoken bcrypt
  ```

  - jsonwebtoken: For JWT signing/verification
  - bcrypt: For password hashing
  - Estimated time: 5 mins (installation)

---

## 🔐 Phase 2: Middleware & Authentication (Weeks 2-3)

### Middleware

- [ ] **Task 2.1 - Create Auth Middleware**
  - File: `backend/src/middleware/authMiddleware.js`
  - Extracts JWT from Authorization header
  - Verifies signature using JWT_SECRET
  - Attaches req.user = { userId, username }
  - Returns 401 for missing/invalid tokens
  - Estimated time: 2-3 hours

- [ ] **Task 2.2 - Create Ownership Middleware** (Optional)
  - File: `backend/src/middleware/ownershipMiddleware.js`
  - Factory function for checking resource ownership
  - Returns 403 if user doesn't own resource
  - Returns 404 if resource doesn't exist
  - Estimated time: 1-2 hours (optional, can inline in controller)

- [ ] **Task 2.3 - Add Request Logging Middleware** (Optional)
  - Include userId in logs for debugging
  - Estimated time: 30 mins

### Utilities

- [ ] **Task 2.4 - Create JWT Utility Functions**
  - File: `backend/src/utils/jwtUtils.js`
  - Functions: `generateToken(userId, username)`, `verifyToken(token)`
  - Use process.env.JWT_SECRET and JWT_EXPIRY
  - Handle errors gracefully
  - Estimated time: 1-2 hours

- [ ] **Task 2.5 - Create Password Utility Functions**
  - File: `backend/src/utils/passwordUtils.js`
  - Functions: `hashPassword(plainText)`, `comparePassword(plainText, hash)`
  - Use bcrypt with 10 rounds
  - Estimated time: 1 hour

---

## 👤 Phase 3: User Authentication Endpoints (Weeks 3-4)

### Controllers

- [ ] **Task 3.1 - Create Auth Controller**
  - File: `backend/src/controllers/authController.js`
  - Method: `register(req, res)` - POST /api/v2/auth/register
    - Validate: username, email, password (min 8 chars)
    - Check: uniqueness of username/email
    - Hash password, create user, return JWT
    - Return 409 if user exists, 400 if validation fails
  - Method: `login(req, res)` - POST /api/v2/auth/login
    - Validate credentials
    - Compare password hash
    - Return JWT token
    - Return 401 if invalid credentials
  - Method: `refresh(req, res)` - POST /api/v2/auth/refresh (OPTIONAL)
  - Estimated time: 4-5 hours

- [ ] **Task 3.2 - Add Validation Helper**
  - File: `backend/src/utils/validation.js` (optional)
  - Functions: `validateUsername()`, `validateEmail()`, `validatePassword()`
  - Estimated time: 1 hour (optional)

### Routers

- [ ] **Task 3.3 - Create Auth Router**
  - File: `backend/src/router/authRouter.js`
  - Routes:
    - `POST /register` → authController.register
    - `POST /login` → authController.login
    - `POST /refresh` → authController.refresh (optional)
  - No authentication required (public endpoints)
  - Estimated time: 2 hours

- [ ] **Task 3.4 - Wire Up Auth Router in app.js**
  - Import authRouter
  - Mount at `/api/v2/auth`
  - Test basic auth flow
  - Estimated time: 30 mins

---

## 🛠️ Phase 4: Update Commands Endpoints (Weeks 4-5)

### Controllers

- [ ] **Task 4.1 - Update Commands Controller for v2**
  - File: `backend/src/controllers/commandsController.js` (or create new v2 version)
  - Update: `list(req, res)`
    - Filter by userId from JWT
    - Support trigger search within user's commands only
    - Support pagination
  - Update: `getById(req, res)`
    - Check ownership (403 if not owner)
    - Return 404 if not found
  - Update: `create(req, res)`
    - Auto-set userId from req.user
    - Validate: name, command, text lengths
    - Check duplicate command per user (409 if exists)
    - Return 201 on success
  - Update: `update(req, res)` (PATCH)
    - Check ownership
    - Remove userId from updates (prevent modification)
    - Update timestamps
    - Return 200 on success
  - Update: `delete(req, res)` (DELETE)
    - Check ownership
    - Delete command
    - Return 204 No Content
  - Estimated time: 5-6 hours

- [ ] **Task 4.2 - Add Error Handling**
  - Consistent error responses with proper HTTP status codes
  - Distinguish between 404 (not found) and 403 (forbidden)
  - Estimated time: 1 hour

### Routers

- [ ] **Task 4.3 - Create v2 Commands Router**
  - File: `backend/src/router/commandsRouter_v2.js`
  - Routes (with authMiddleware):
    - `GET /` → list commands
    - `GET /:id` → get single command
    - `POST /` → create command
    - `PATCH /:id` → update command
    - `DELETE /:id` → delete command
  - All routes protected by authMiddleware
  - Estimated time: 2 hours

- [ ] **Task 4.4 - Keep v1 Router Intact**
  - Ensure v1 router still works without authentication
  - No changes to v1 business logic
  - Estimated time: 30 mins (verification)

### App.js

- [ ] **Task 4.5 - Update app.js**
  - Import auth router and v2 commands router
  - Register auth router at `/api/v2/auth`
  - Register v2 commands router at `/api/v2/commands` with authMiddleware
  - Keep v1 router at `/api/commands` without auth (if API_VERSION = 'both')
  - Use API_VERSION environment variable to decide which routes to mount
  - Estimated time: 2 hours

---

## 🗄️ Phase 5: Migration & Data (Weeks 5-6)

### Migration Script

- [ ] **Task 5.1 - Create Migration Script**
  - File: `backend/scripts/migrate-v1-to-v2.js`
  - Step 1: Connect to MongoDB
  - Step 2: Create migration user with temp password
  - Step 3: Count commands without userId
  - Step 4: Update all commands to have userId (migration user ID)
  - Step 5: Verify counts match
  - Step 6: Log migration user ID for records
  - Safety: Make it dry-run capable
  - Estimated time: 2-3 hours

- [ ] **Task 5.2 - Create Rollback Script** (Optional but Recommended)
  - File: `backend/scripts/rollback-migration.js`
  - Remove userId from commands that were migrated
  - Delete migration user if needed
  - Log what was rolled back
  - Estimated time: 1-2 hours

### Testing Setup

- [ ] **Task 5.3 - Create Integration Tests**
  - File: `backend/tests/integration.test.js` or similar
  - Test cases:
    - [ ] Register new user (201, returns user + token)
    - [ ] Login with correct credentials (200, returns token)
    - [ ] Login with wrong credentials (401)
    - [ ] Create command as authenticated user (201, includes userId)
    - [ ] List commands shows only user's commands
    - [ ] Access another user's command (403 Forbidden)
    - [ ] Update own command (200 OK)
    - [ ] Delete own command (204 No Content)
    - [ ] Missing auth token (401)
    - [ ] Expired token (401)
    - [ ] Malformed token (401)
  - Estimated time: 4-5 hours

- [ ] **Task 5.4 - Create Manual Test Plan**
  - Document steps to manually test all flows
  - v1 backward compatibility checks
  - v2 authentication flows
  - Data isolation checks
  - Estimated time: 1-2 hours

### Pre-Deployment Verification

- [ ] **Task 5.5 - Test on Staging**
  - Deploy code to staging with API_VERSION=both
  - Run migration script on staging DB copy
  - Verify v1 endpoints still work
  - Verify v2 endpoints require auth
  - Verify users can register and login
  - Verify data isolation works
  - Estimated time: 2-3 hours

---

## 📚 Phase 6: Documentation & Deployment (Weeks 6-7)

### Documentation

- [ ] **Task 6.1 - Update README.md**
  - Add section: "API Versions (v1 vs v2)"
  - Include: v2 authentication example
  - Include: v2 command creation example
  - Include: migration guide for clients
  - Estimated time: 2 hours

- [ ] **Task 6.2 - Create API Migration Guide**
  - File: `docs/MIGRATION_GUIDE.md`
  - Show v1 curl example → v2 curl example
  - Explain how to get JWT token
  - Explain response format changes
  - Include: common errors and how to fix them
  - Estimated time: 2 hours

- [ ] **Task 6.3 - Update API Documentation (Swagger)**
  - Add v2 endpoints to Swagger spec
  - Document auth header requirement
  - Document error responses (401, 403)
  - Estimated time: 2 hours

- [ ] **Task 6.4 - Create Internal Documentation**
  - File: `docs/IMPLEMENTATION_NOTES.md`
  - Include: migration user details
  - Include: JWT_SECRET generation steps
  - Include: troubleshooting guide
  - Estimated time: 2 hours

### Security Review

- [ ] **Task 6.5 - Security Checklist**
  - [ ] JWT_SECRET is strong (>32 characters, random)
  - [ ] Passwords are hashed with bcrypt (min 10 rounds)
  - [ ] Tokens expire after short time (7 days max)
  - [ ] 401 returned for missing/invalid tokens
  - [ ] 403 returned for ownership violations
  - [ ] No sensitive data logged
  - [ ] HTTPS is enforced in production
  - Estimated time: 1 hour

### Deployment

- [ ] **Task 6.6 - Prepare Production Deployment**
  - [ ] Set `API_VERSION=both` in production
  - [ ] Set strong `JWT_SECRET` environment variable
  - [ ] Run migration script on production backup FIRST
  - [ ] Verify no data loss
  - [ ] Deploy code to production
  - [ ] Monitor logs for errors
  - [ ] Perform smoke tests
  - Estimated time: 2-3 hours (actual deployment)

- [ ] **Task 6.7 - Communicate with Users**
  - [ ] Announce v2 availability in documentation
  - [ ] Provide migration guide and support
  - [ ] Set sunset date for v1 (e.g., 6 months)
  - [ ] Create FAQ for common questions
  - Estimated time: 1-2 hours

---

## 📊 Post-Deployment Monitoring (Weeks 7+)

- [ ] Monitor error rates (should stay flat or decrease)
- [ ] Track v1 vs v2 endpoint usage (expect v2 to grow)
- [ ] Monitor JWT validation failures (should be low)
- [ ] Check password hash times (should be ~100ms)
- [ ] Review user registration metrics
- [ ] Collect feedback on v2 from early adopters

---

## 🚀 Quick Task Status Template

Use this to track real progress:

```
PHASE 1: Setup (Week 1-2)
  [x] 1.1 User Model
  [x] 1.2 User Schema
  [ ] 1.3 Update Command Schema
  [ ] 1.4 Update Command Model
  [ ] 1.5 .env configuration
  [ ] 1.6 .env.example
  [ ] 1.7 Install packages

PHASE 2: Middleware (Week 2-3)
  [ ] 2.1 Auth Middleware
  [ ] 2.2 Ownership Middleware
  [ ] 2.3 Request Logging
  [ ] 2.4 JWT Utils
  [ ] 2.5 Password Utils

... (etc)
```

---

## 🎯 Success Criteria

✅ All tasks completed  
✅ All tests passing (unit + integration)  
✅ Staging deployment successful  
✅ v1 and v2 both working simultaneously  
✅ Documentation updated  
✅ Team trained on v2 architecture  
✅ Users can register and login  
✅ Data isolation verified (user can't access another's data)  
✅ Performance benchmarks acceptable  
✅ Security review passed

---

**End of Implementation Checklist**

Start with Phase 1, Task 1.1. Good luck! 🚀
