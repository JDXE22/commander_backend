# Software Design Document: Commander API v2

## User-Based Data Ownership & Privacy

**Version:** 1.0  
**Date:** March 2026  
**Status:** Design Phase  
**Audience:** Full-Stack Team

---

## 1. Executive Summary

This document outlines the upgrade of the Commander API from a single-shared-data model (v1) to a multi-user, privately-owned data model (v2). The changes introduce user authentication, data isolation per user, and API versioning while maintaining backward compatibility with v1.

**Key Goals:**

- ✅ Introduce API versioning (v1 and v2 coexist)
- ✅ Implement user authentication and data ownership
- ✅ Enforce privacy: users only see/modify their own commands
- ✅ Safely migrate existing v1 data
- ✅ Maintain backward compatibility during transition

---

## 2. Architecture Overview

### 2.1 High-Level System Diagram (v2)

```
┌─────────────┐
│   Client    │
│  (Browser/  │
│   Mobile)   │
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┐
       │                  │                  │
    v1 API             v2 API            Web UI
   (Legacy)         (New - Versioned)   (Unchanged)
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────────────────────────────────────┐
│         Express Application (app.js)          │
│  ┌─────────────────────────────────────────┐ │
│  │ Middleware Layer                        │ │
│  │  • CORS                                 │ │
│  │  • Body parser                          │ │
│  │  • Request logging                      │ │
│  │  • Error handling                       │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │ Router Layer                            │ │
│  │  • /api/v1/commands       (legacy)      │ │
│  │  • /api/v2/commands       (new)         │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │ Authentication & Authorization          │ │
│  │  • JWT token validation (v2 only)       │ │
│  │  • User context extraction              │ │
│  │  • Data ownership checks                │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │ Controller Layer                        │ │
│  │  • CommandController (handles both v1)  │ │
│  │  • UserController (new for v2)          │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │ Model Layer                             │ │
│  │  • CommandModel (for local/Mongo)       │ │
│  │  • UserModel (new - MongoDB only)       │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
       │
       └─────────────────┬──────────────────┐
                         │                  │
                      Local Mode        MongoDB
                      (v1 only)          (v1 & v2)
                         │                  │
                         ▼                  ▼
                    commands.json       MongoDB
```

### 2.2 Key Architectural Changes

| Aspect             | v1                 | v2                                                |
| ------------------ | ------------------ | ------------------------------------------------- |
| **API Path**       | `/api/commands`    | `/api/commands` (same) + `/api/v2/...` (explicit) |
| **User System**    | None               | JWT + User Model                                  |
| **Data Ownership** | Shared global      | User-scoped                                       |
| **Storage**        | Both Local + Mongo | MongoDB only                                      |
| **Authentication** | None               | Bearer token (JWT)                                |
| **Authorization**  | None               | User-based middleware                             |

### 2.3 Configuration via Environment Variables

```bash
# Current - stays as is
NODE_ENV=production
MONGODB_URI=mongodb://...

# New in v2
API_VERSION=v2                   # Can be "v1", "v2", or "both"
JWT_SECRET=your-secret-key       # For signing JWT tokens
JWT_EXPIRY=7d                    # Token expiration
API_SUFFIX=/api/v2               # Or configurable per environment
ALLOW_V1_LEGACY=true            # Use true in production during transition
```

---

## 3. Data Model Design

### 3.1 Users Collection (New in v2)

The `users` collection stores user accounts and authentication info.

```json
{
  "_id": ObjectId,
  "username": "john_doe",           // Unique identifier
  "email": "john@example.com",       // For contact/recovery
  "passwordHash": "$2b$10$...",      // Bcrypt hashed password
  "createdAt": "2026-03-17T10:00:00Z",
  "updatedAt": "2026-03-17T10:00:00Z",
  "isActive": true,                  // Soft delete / account suspension
  "tier": "free",                    // "free", "pro", "enterprise" (future)
  "commandsQuota": 100               // Limit commands per user (future)
}
```

**Schema Validation (Mongoose):**

- `username`: Required, unique, min 3 chars, max 50 chars
- `email`: Required, unique, valid email format
- `passwordHash`: Required, stored as bcrypt hash (never plain text)
- `isActive`: Boolean, default true

**Indexes:**

```javascript
// Create these for performance:
users.createIndex({ username: 1 }, { unique: true });
users.createIndex({ email: 1 }, { unique: true });
users.createIndex({ createdAt: 1 }); // For sorting/filtering
```

### 3.2 Commands Collection (Updated for v2)

The `commands` collection is updated to include user ownership.

```json
{
  "_id": ObjectId,
  "name": "Hello Command",
  "command": "/hello",               // The trigger string
  "text": "Hello, world!",            // The response
  "userId": ObjectId("user-123"),     // ⭐ NEW: Links command to owner
  "createdAt": "2026-03-17T10:00:00Z",
  "updatedAt": "2026-03-17T10:00:00Z",
  "tags": ["greeting", "friendly"],   // Optional: for future filtering
  "isPublic": false                   // Optional: future sharing feature
}
```

**Schema Changes:**

- ✅ `userId` is mandatory in v2 (links to `users._id`)
- ✅ `userId` is optional in v1 (for backward compatibility during migration)
- ✅ Timestamps are added for auditing
- ⚠️ No changes to `name`, `command`, `text` fields

**Indexes (Critical for Performance):**

```javascript
// Composite index: userId + command (for finding user's command by trigger)
commands.createIndex({ userId: 1, command: 1 }, { unique: true });

// Index on userId alone (for listing user's commands)
commands.createIndex({ userId: 1 });

// Index on createdAt (for time-based queries)
commands.createIndex({ createdAt: 1 });

// Full-text search (optional, for future search feature)
commands.createIndex({ name: 'text', command: 'text', text: 'text' });
```

### 3.3 Relationship Diagram

```
┌──────────────────────┐
│ users               │
├──────────────────────┤
│ _id (PK)            │  1
│ username            │──────────────┐
│ email               │              │ (has many)
│ passwordHash        │              │
│ createdAt           │              │
└──────────────────────┘              │
                                      │ (owns)
                                      │
                                      │ M
                                      │
                          ┌──────────────────────┐
                          │ commands            │
                          ├──────────────────────┤
                          │ _id (PK)            │
                          │ userId (FK) ◄───────┘
                          │ name                │
                          │ command (trigger)   │
                          │ text                │
                          │ createdAt           │
                          └──────────────────────┘
```

**Key Points:**

- One user can have many commands (1:N relationship)
- Each command belongs to exactly one user
- Foreign key: `commands.userId` → `users._id`
- Data isolation: User can only access their own commands

---

## 4. API Design

### 4.1 Versioning Strategy

**Why Two API Paths?**

- **`/api/v1/commands`**: Legacy endpoint (optional, for explicit versioning)
- **`/api/v2/commands`**: New user-scoped endpoint
- **`/api/commands`**: Can remain as v1 during transition (deprecated in favor of explicit versioning)

**Implementation:**
The router will check `API_SUFFIX` environment variable and mount routes accordingly:

```javascript
// In app.js
const apiVersion = process.env.API_VERSION || 'v2';
const apiSuffix = process.env.API_SUFFIX || '/api/v2';

// Mount based on environment
if (apiVersion === 'v1' || apiVersion === 'both') {
  app.use('/api/commands', commandRouter_v1({ commandModel }));
  app.use('/api/v1/commands', commandRouter_v1({ commandModel }));
}

if (apiVersion === 'v2' || apiVersion === 'both') {
  app.use(apiSuffix, authMiddleware, commandRouter_v2({ commandModel }));
  app.use(
    '/api/v2/commands',
    authMiddleware,
    commandRouter_v2({ commandModel }),
  );
}
```

### 4.2 Authentication (v2 Only)

**Method:** Bearer Token (JWT)

**Header Format:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Claims:**

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "iat": 1710700800, // issued at
  "exp": 1711305600 // expires at (7 days)
}
```

**How to Get a Token (New Endpoints in v2):**

| Method | Route                   | Purpose                 |
| ------ | ----------------------- | ----------------------- |
| `POST` | `/api/v2/auth/register` | Create new user account |
| `POST` | `/api/v2/auth/login`    | Get JWT token           |
| `POST` | `/api/v2/auth/refresh`  | Refresh expired token   |

### 4.3 Endpoint Comparison: v1 vs v2

#### GET /api/commands (or /api/v1/commands)

**v1 Behavior (Unchanged):**

```
GET /api/commands?trigger=%2Fhello
Authorization: (optional)

Response:
{
  "name": "Hello",
  "command": "/hello",
  "text": "Hello, world!"
}
```

**v2 Behavior (New - Requires Auth):**

```
GET /api/v2/commands?trigger=%2Fhello
Authorization: Bearer <JWT_TOKEN>

Response (only user's commands):
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "name": "Hello",
  "command": "/hello",
  "text": "Hello, world!",
  "createdAt": "2026-03-17T10:00:00Z",
  "updatedAt": "2026-03-17T10:00:00Z"
}
```

#### GET /api/commands/:id (or /api/v1/commands/:id)

**v1:** Returns any command by ID  
**v2:** Returns only if user owns it (returns 404 if not owned)

#### POST /api/commands (or /api/v1/commands)

**v1:**

```json
POST /api/commands
{
  "name": "Hello",
  "command": "/hello",
  "text": "Hello, world!"
}
```

**v2:**

```json
POST /api/v2/commands
Authorization: Bearer <JWT_TOKEN>
{
  "name": "Hello",
  "command": "/hello",
  "text": "Hello, world!"
}

Response includes userId automatically:
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "name": "Hello",
  "command": "/hello",
  "text": "Hello, world!",
  "createdAt": "2026-03-17T10:00:00Z"
}
```

**Key Difference:** v2 automatically assigns `userId` from the JWT token. Users cannot specify `userId` themselves.

#### PATCH /api/commands/:id (or /api/v1/commands/:id)

**v1:** Update any command  
**v2:** Update only if user owns it (returns 403 Forbidden if not owned)

#### DELETE /api/commands/:id

**v1:** Delete any command  
**v2:** Delete only if user owns it (returns 403 Forbidden if not owned)

### 4.4 Full v2 API Reference

#### Authentication Endpoints

```
POST /api/v2/auth/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (201 Created):
{
  "_id": "507f191e810c19729de860ea",
  "username": "john_doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

```
POST /api/v2/auth/login
{
  "username": "john_doe",
  "password": "SecurePass123!"
}

Response (200 OK):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": "507f191e810c19729de860ea",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

#### Command Endpoints (v2)

```
GET /api/v2/commands
Authorization: Bearer <TOKEN>

Response:
{
  "commands": [
    {
      "_id": "id1",
      "userId": "507f191e810c19729de860ea",
      "name": "Hello",
      "command": "/hello",
      "text": "Hello, world!",
      "createdAt": "2026-03-17T10:00:00Z"
    }
  ],
  "totalPages": 1,
  "currentPage": 1
}
```

```
POST /api/v2/commands
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "Hello",
  "command": "/hello",
  "text": "Hello, world!"
}

Response (201 Created):
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "name": "Hello",
  "command": "/hello",
  "text": "Hello, world!",
  "createdAt": "2026-03-17T10:00:00Z"
}
```

```
PATCH /api/v2/commands/:id
Authorization: Bearer <TOKEN>

{
  "text": "Updated response"
}

Response (200 OK):
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "name": "Hello",
  "command": "/hello",
  "text": "Updated response",
  "updatedAt": "2026-03-17T10:15:00Z"
}
```

```
DELETE /api/v2/commands/:id
Authorization: Bearer <TOKEN>

Response (204 No Content)
```

---

## 5. Security & Authorization

### 5.1 Authentication Mechanism

**Technology:** JWT (JSON Web Token) with HS256 (HMAC with SHA-256)

**Flow:**

1. User registers or logs in
2. Server issues JWT signed with `JWT_SECRET`
3. Client stores JWT (in localStorage, memory, or secure cookie)
4. Client includes JWT in `Authorization: Bearer <token>` header
5. Server validates JWT signature and expiration
6. Server extracts `userId` from token claims

**Middleware Implementation Pseudocode:**

```javascript
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

### 5.2 Authorization: Ownership Verification

**Key Principle:** Before returning or modifying a resource, verify the user owns it.

**Pattern (for Commands):**

```javascript
const getCommand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.user; // From JWT

    const command = await CommandModel.findById(id);

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // ⭐ CRITICAL: Check ownership
    if (command.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ error: 'Not authorized to access this command' });
    }

    res.json(command);
  } catch (err) {
    next(err);
  }
};
```

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `204` - No Content (delete)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (user not owner)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate trigger command)
- `500` - Server Error

### 5.3 HTTPS & Additional Security

**Assumptions (Configure in Production):**

- ✅ All endpoints use HTTPS in production
- ✅ JWT_SECRET is strong and unique per environment
- ✅ CORS is configured to allow trusted origins only
- ✅ Passwords are hashed using bcrypt (min 10 rounds)
- ✅ JWT tokens are short-lived (7 days expiry)
- ✅ Refresh tokens (optional) for longer sessions

**Sample Bcrypt Usage:**

```javascript
import bcrypt from 'bcrypt';

// On registration
const passwordHash = await bcrypt.hash(plainTextPassword, 10);

// On login
const isValid = await bcrypt.compare(plainTextPassword, passwordHash);
```

### 5.4 Data Privacy Best Practices

1. **Never Log Sensitive Data:** Avoid logging tokens, passwords, or PII
2. **Input Validation:** Validate all user inputs (name, command, text length limits)
3. **Rate Limiting:** Consider rate-limiting auth endpoints (5 failed attempts → lockout)
4. **Soft Deletes:** Mark users/commands as inactive instead of hard deleting
5. **Audit Trail:** Log who created/modified/deleted commands (userId + timestamp)

---

## 6. Migration Strategy

### 6.1 The Challenge

**Current State (v1):**

- Commands exist with no `userId` field
- No user accounts
- Shared global data

**End State (v2):**

- Every command has a `userId`
- Users own their data
- Private, isolated access

### 6.2 Migration Approach: "Default User System"

We'll create a **default user** to own all existing commands during migration.

**Step 1: Create Migration User Account**

```javascript
// Run this once during migration
const migrationUser = await User.create({
  username: 'legacy_v1_owner',
  email: 'legacy@commander.local',
  passwordHash: bcrypt.hash('TEMP_SECURE_PASSWORD', 10),
  isActive: true,
  isMigrationUser: true, // Flag for special handling
});

// Save this ID:
const LEGACY_USER_ID = migrationUser._id;
```

**Step 2: Assign All Existing Commands to Migration User**

```javascript
// This is a one-time database operation
await Command.updateMany(
  { userId: { $exists: false } }, // Find commands without userId
  { $set: { userId: LEGACY_USER_ID } },
);
```

**Step 3: Create "Real" User Accounts from Clients**

- In v2, new clients register and create their own accounts
- They can create new commands
- They can optionally "claim" legacy commands (if applicable)

**Step 4: Optional - Let Users Claim Legacy Commands**

If you want users to have personal ownership of legacy commands:

```javascript
// Endpoint to claim back v1 commands (one-time operation per user)
POST /api/v2/commands/claim-legacy
Authorization: Bearer <TOKEN>

// Move all migration-user commands to requesting user
// But only once per user, and log the action
```

### 6.3 Backward Compatibility During Transition

**Phase 1 (Months 1-2): "Coexistence"**

- Run both v1 and v2 APIs
- `API_VERSION=both` in environment
- v1 clients continue working unchanged
- New v2 clients can start registering

**Phase 2 (Months 3-6): "Deprecation Notice"**

- Keep both running
- Warn v1 users in documentation
- v1 endpoints start returning deprecation headers

**Phase 3 (Month 7+): "v1 Sunset"**

- v1 endpoints are removed or return 410 Gone
- All clients must upgrade to v2

### 6.4 Handling Edge Cases

| Scenario                                                  | Solution                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| What if a client makes requests with no auth token to v2? | Return 401. They must register and include JWT.                                     |
| What if two users need the same trigger (e.g., `/hello`)? | ✅ Allowed! Databases index ensures uniqueness only per user + command combination. |
| What if a legacy command is modified?                     | ✅ It's updated with `updatedAt` timestamp.                                         |
| What if someone tries to delete the migration user?       | ✅ We prevent this with a special check: `if (user.isMigrationUser) return 403`.    |

---

## 7. Implementation Plan

### Phase 1: Setup & Infrastructure (Weeks 1-2)

#### Task 1.1: Add User Model

- **File:** Create `backend/src/models/mongo/userModel.js`
- **Actions:**
  - Define Mongoose schema for users
  - Add validation (username, email, password)
  - Add unique indexes
  - Add bcrypt hashing for passwords
  - Export User model

#### Task 1.2: Add User Schema

- **File:** Create `backend/src/schemas/mongo-schema/userSchema.js`
- **Mongoose Schema Definition** (see Example 1 below)

#### Task 1.3: Update Command Schema

- **File:** Modify `backend/src/schemas/mongo-schema/commandSchema.js`
- **Changes:**
  - Add `userId` field (ObjectId, references User)
  - Add `createdAt` timestamp
  - Add `updatedAt` timestamp
  - Add validation for required fields

**Example 1: User Schema**

```javascript
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /.+\@.+\..+/,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isMigrationUser: {
    type: Boolean,
    default: false,
  },
});

// Pre-save bcrypt logic (optional utility function)
export const hashPassword = async (plainText) => {
  return await bcrypt.hash(plainText, 10);
};

export const userSchema = userSchema;
```

**Example 2: Updated Command Schema**

```javascript
import mongoose from 'mongoose';

const commandSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true },
    command: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Composite index: userId + command must be unique per user
commandSchema.index({ userId: 1, command: 1 }, { unique: true });
commandSchema.index({ userId: 1 });

export const commandSchema = commandSchema;
```

#### Task 1.4: Update Environment Config

- **File:** Modify or create `backend/src/config/config.js`
- **Add:**
  ```javascript
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
  API_VERSION: process.env.API_VERSION || 'v2',
  API_SUFFIX: process.env.API_SUFFIX || '/api/v2'
  ```

#### Task 1.5: Install JWT Library

- **Action:** `npm install jsonwebtoken bcrypt`
- **Purpose:** JWT signing/verification and password hashing

### Phase 2: Middleware & Authentication (Weeks 2-3)

#### Task 2.1: Create Auth Middleware

- **File:** Create `backend/src/middleware/authMiddleware.js`
- **Functionality:**
  - Extract JWT token from `Authorization` header
  - Verify JWT signature using `JWT_SECRET`
  - Attach user info to `req.user`
  - Handle expired tokens (401) and missing tokens (401)

**Example 3: Auth Middleware**

```javascript
import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid authorization header' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

#### Task 2.2: Create Ownership Middleware

- **File:** Create `backend/src/middleware/ownershipMiddleware.js`
- **Functionality:**
  - Middleware factory that checks if user owns a command
  - Used as: `ownershipCheck('commandId')`
  - Returns 403 if user doesn't own resource
  - Returns 404 if resource doesn't exist

**Example 4: Ownership Middleware**

```javascript
export const ownershipCheck = (resourceIdParam) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const { userId } = req.user;

      const command = await Command.findById(resourceId);

      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }

      if (command.userId.toString() !== userId) {
        return res
          .status(403)
          .json({ error: 'Not authorized to access this resource' });
      }

      req.resource = command;
      next();
    } catch (err) {
      next(err);
    }
  };
};
```

#### Task 2.3: Create JWT Utility Functions

- **File:** Create `backend/src/utils/jwtUtils.js`
- **Functions:**
  - `generateToken(userId, username)` - Create JWT
  - `verifyToken(token)` - Verify JWT
  - `decodeToken(token)` - Decode without verification

### Phase 3: User Authentication Endpoints (Weeks 3-4)

#### Task 3.1: Create User Controller

- **File:** Create `backend/src/controllers/authController.js`
- **Methods:**
  - `register(req, res)` - POST /api/v2/auth/register
  - `login(req, res)` - POST /api/v2/auth/login
  - `refresh(req, res)` - POST /api/v2/auth/refresh (optional)

**Example 5: Auth Controller (Register)**

```javascript
import { User } from '../models/mongo/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthController {
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ error: 'Username, email, and password required' });
      }

      if (password.length < 8) {
        return res
          .status(400)
          .json({ error: 'Password must be at least 8 characters' });
      }

      // Check if user exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      });
      if (existingUser) {
        return res
          .status(409)
          .json({ error: 'Username or email already exists' });
      }

      // Hash password and create user
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        username,
        email,
        passwordHash,
      });

      // Generate token
      const token = jwt.sign(
        { userId: user._id.toString(), username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' },
      );

      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token,
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: 'Username and password required' });
      }

      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'User account is deactivated' });
      }

      const token = jwt.sign(
        { userId: user._id.toString(), username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' },
      );

      res.status(200).json({
        token,
        user: {
          userId: user._id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
```

#### Task 3.2: Create Auth Router

- **File:** Create `backend/src/router/authRouter.js`
- **Routes:**
  - `POST /register`
  - `POST /login`
  - `POST /refresh` (optional)

### Phase 4: Update Commands Endpoints (Weeks 4-5)

#### Task 4.1: Create v2 Commands Controller

- **File:** Modify or create new: `backend/src/controllers/commandsController.js`
- **Updates to existing methods:**
  - **list()** - Add userId filter: `{ userId: req.user.userId }`
  - **getById()** - Add ownership check, return 403 if not owner
  - **create()** - Auto-set `userId` from JWT: `{ ...body, userId: req.user.userId }`
  - **update()** - Verify ownership before updating
  - **delete()** - Verify ownership before deleting

**Example 6: Updated Commands Controller**

```javascript
import { Command } from '../models/mongo/commandModel.js';

export class CommandController {
  async list(req, res, next) {
    try {
      const { userId } = req.user; // From JWT
      const { trigger, page = 1, limit = 5 } = req.query;

      // Build query: always filter by userId
      const query = { userId };
      if (trigger) {
        query.command = trigger;
        const command = await Command.findOne(query);
        return res.json(command);
      }

      // Pagination
      const skip = (page - 1) * limit;
      const commands = await Command.find(query).skip(skip).limit(limit);

      const total = await Command.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      res.json({ commands, totalPages, currentPage: page });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { userId } = req.user;
      const { name, command, text } = req.body;

      // Validation
      if (!name || !command || !text) {
        return res
          .status(400)
          .json({ error: 'Name, command, and text required' });
      }

      if (command.length > 256) {
        return res.status(400).json({ error: 'Command too long' });
      }

      // Check for duplicate command trigger per user
      const existing = await Command.findOne({ userId, command });
      if (existing) {
        return res
          .status(409)
          .json({ error: 'Command already exists for this user' });
      }

      const newCommand = await Command.create({
        userId,
        name,
        command,
        text,
      });

      res.status(201).json(newCommand);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.user;

      const command = await Command.findById(id);

      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }

      // Ownership check
      if (command.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      res.json(command);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.user;
      const updates = req.body;

      const command = await Command.findById(id);

      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }

      if (command.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Prevent userId modification
      if (updates.userId) {
        delete updates.userId;
      }

      updates.updatedAt = new Date();
      const updatedCommand = await Command.findByIdAndUpdate(id, updates, {
        new: true,
      });

      res.json(updatedCommand);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.user;

      const command = await Command.findById(id);

      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }

      if (command.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await Command.deleteOne({ _id: id });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
```

#### Task 4.2: Create v2 Router

- **File:** Create `backend/src/router/commandsRouter_v2.js`
- **Routes:** Mount all CRUD endpoints with `authMiddleware`

#### Task 5.1: Update app.js

- **Changes:**
  - Import new auth router
  - Import new v2 commands router
  - Register auth middleware on v2 routes
  - Mount both v1 and v2 based on `API_VERSION`

**Example 7: Updated app.js**

```javascript
import express from 'express';
import 'dotenv/config';
import { commandRouter } from './router/router.js';
import { authRouter } from './router/authRouter.js';
import { commandRouter_v2 } from './router/commandsRouter_v2.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import cors from 'cors';

export const createApp = ({ commandModel, userModel }) => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // v2 Auth endpoints (no auth required)
  app.use('/api/v2/auth', authRouter({ userModel }));

  // v1 Commands (legacy, no auth)
  const apiVersion = process.env.API_VERSION || 'v2';
  if (apiVersion === 'v1' || apiVersion === 'both') {
    app.use('/api/commands', commandRouter({ commandModel }));
    app.use('/api/v1/commands', commandRouter({ commandModel }));
  }

  // v2 Commands (new, requires auth)
  if (apiVersion === 'v2' || apiVersion === 'both') {
    app.use(
      '/api/v2/commands',
      authMiddleware,
      commandRouter_v2({ commandModel }),
    );
  }

  return app;
};
```

### Phase 5: Migration & Testing (Weeks 5-6)

#### Task 5.1: Write Migration Script

- **File:** Create `backend/scripts/migrate-v1-to-v2.js`
- **Actions:**
  1. Create migration user
  2. Assign all existing commands to migration user
  3. Log the operation
  4. Verify counts match

**Example 8: Migration Script**

```javascript
import mongoose from 'mongoose';
import 'dotenv/config';
import { User } from '../src/models/mongo/userModel.js';
import { Command } from '../src/models/mongo/commandModel.js';
import bcrypt from 'bcrypt';

async function migrate() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);

  try {
    // Step 1: Create migration user
    const migrationUser = await User.create({
      username: 'legacy_v1_owner',
      email: 'legacy@commander.local',
      passwordHash: await bcrypt.hash('TEMP_SECURE_PASS_123', 10),
      isMigrationUser: true,
    });

    console.log(`Created migration user: ${migrationUser._id}`);

    // Step 2: Count commands without userId
    const countBefore = await Command.countDocuments({
      userId: { $exists: false },
    });
    console.log(`Assigning ${countBefore} commands to migration user...`);

    // Step 3: Assign all v1 commands
    const result = await Command.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: migrationUser._id } },
    );

    console.log(`Updated ${result.modifiedCount} commands`);
    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
```

#### Task 5.2: Write Integration Tests

- **File:** Create `backend/tests/integration.test.js`
- **Test Cases:**
  - Register new user
  - Login and get token
  - Create command as user
  - List commands (should only see own)
  - Try to access another user's command (should fail 403)
  - Update own command
  - Delete own command

#### Task 5.3: Manual Testing Checklist

- [ ] Can register new user
- [ ] Can login and get JWT
- [ ] Can create command with v2 endpoint
- [ ] Cannot see other users' commands
- [ ] Can update own commands
- [ ] Can delete own commands
- [ ] v1 endpoint still works (if API_VERSION=both)
- [ ] Expired tokens return 401
- [ ] Missing token returns 401

### Phase 6: Deployment & Documentation (Weeks 6-7)

#### Task 6.1: Update Documentation

- Update `README.md` with v2 usage examples
- Add `.env.example` showing new variables
- Create API migration guide for clients

#### Task 6.2: Environment Configuration

- Set `API_VERSION=both` in staging
- Verify v1 and v2 both work
- Monitor error logs
- Perform load testing

#### Task 6.3: Production Rollout

- Day 1: Deploy with `API_VERSION=both`
- Weeks 1-4: Monitor, no changes to clients needed
- Weeks 5-8: Encourage clients to migrate to v2
- Week 9+: Deprecation notice in responses
- Week 12+: Sunset v1 (only if all clients migrated)

---

## 8. Risks & Trade-offs

### 8.1 Risks

| Risk                             | Severity | Mitigation                                                                  |
| -------------------------------- | -------- | --------------------------------------------------------------------------- |
| Data corruption during migration | High     | Backup DB before migration; run on staging first; write verification script |
| Broken v1 clients                | High     | Keep v1 working for 3-6 months; provide clear migration guide               |
| JWT token leakage                | High     | Use HTTPS only; short expiry (7d); refresh tokens for sensitive operations  |
| User account takeover            | Medium   | Rate limit login attempts; password complexity requirements; optional 2FA   |
| Performance regression           | Medium   | Index userId in commands; monitor query times; load test                    |
| Complexity of dual APIs          | Medium   | Clear documentation; separate router files; gradual sunset plan             |

### 8.2 Trade-offs

| Trade-off               | Decision               | Reason                                                          |
| ----------------------- | ---------------------- | --------------------------------------------------------------- |
| **v1 & v2 Together**    | Yes, during transition | Avoids breaking existing clients; allows gradual migration      |
| **JWT vs Sessions**     | JWT                    | Stateless, better for APIs; scales better than server sessions  |
| **bcrypt vs other**     | bcrypt                 | Industry standard; slower = more secure against brute force     |
| **Local mode in v2**    | Removed                | Complexity not justified; MongoDB is required for users         |
| **Soft vs hard delete** | Soft delete (optional) | Allows recovery; audit trail; consider trade-offs of disk space |
| **Migration user**      | Single default user    | Simple; avoids complex data reassignment; can be improved later |

---

## 9. Future Enhancements (Phase 2+)

These are NOT in scope for v2 MVP but are worth planning for:

1. **User Roles & Permissions**
   - Admin: manage other users
   - Editor: create/edit commands
   - Viewer: read-only access
   - Share commands with other users

2. **Command Sharing**
   - Mark command as `isPublic: true`
   - Public commands visible to all users
   - Private (default) commands only to owner

3. **Teams & Workspaces**
   - Multiple users in a team
   - Shared command libraries
   - Team-level configuration

4. **Rate Limiting & Quotas**
   - Free tier: 100 commands/month
   - Pro tier: unlimited
   - Track API calls per user per minute

5. **Audit Logging**
   - Log all create/update/delete operations
   - Track by userId + timestamp
   - Replaying changes for debugging

6. **Two-Factor Authentication (2FA)**
   - TOTP-based 2FA
   - Backup codes

---

## 10. Questions for Clarification

Before starting implementation, confirm these with the team:

1. **Local Mode:** Do we need local (file-based) mode for v2?
   - **Answer:** No, v2 requires MongoDB only.

2. **Data Retention:** If a user deletes their account, what happens to their commands?
   - **Answer:** Hard delete or soft delete? (Consider legal/audit requirements)

3. **Backward Compatibility:** How long do we support v1?
   - **Answer:** 6 months? 1 year?

4. **Multi-tenant:** Do we want to support multiple command spaces per user (like projects)?
   - **Answer:** Out of scope for MVP, consider for Phase 2.

5. **Rate Limiting:** Do we need rate limiting for free users?
   - **Answer:** Probably, but not MVP. Suggested for Phase 2.

6. **Password Reset:** Do we need password reset flow?
   - **Answer:** MVP doesn't require it; add for Phase 2.

---

## 11. Summary Checklist

### Before You Start

- [ ] Backup current production database
- [ ] Set up staging environment with current data
- [ ] Install `jsonwebtoken` and `bcrypt` packages
- [ ] Assign developers to tasks (can parallelize 1.1-1.5)

### Development Phase

- [ ] Phase 1: Models & Schemas (2 weeks)
- [ ] Phase 2: Middleware & Auth (2 weeks)
- [ ] Phase 3: Auth Endpoints (2 weeks)
- [ ] Phase 4: Update Commands (2 weeks)
- [ ] Phase 5: Migration & Testing (2 weeks)
- [ ] Phase 6: Deployment & Docs (1 week)

### Deployment Phase

- [ ] Set environment variables (JWT_SECRET, API_VERSION, etc.)
- [ ] Run migration script on staging
- [ ] Run full test suite
- [ ] Deploy to production with API_VERSION=both
- [ ] Monitor logs and error rates
- [ ] Communicate with clients about v2 endpoint

### Maintenance Phase (3-6 months)

- [ ] Track v1 vs v2 usage
- [ ] Collect client feedback
- [ ] Plan deprecation timeline
- [ ] Sunsetting v1 endpoint

---

## 12. Glossary

| Term                    | Definition                                                       |
| ----------------------- | ---------------------------------------------------------------- |
| **JWT**                 | JSON Web Token; a standard for creating stateless access tokens  |
| **Bearer Token**        | JWT-based token sent in `Authorization: Bearer <token>` header   |
| **Ownership**           | User can only access/modify resources they created               |
| **Data Isolation**      | Each user's data is completely separate from other users         |
| **Middleware**          | Express function that intercepts requests before reaching routes |
| **Mongoose**            | ODM (Object Document Mapper) for MongoDB in Node.js              |
| **bcrypt**              | Password hashing algorithm; slow & secure                        |
| **HS256**               | HMAC with SHA-256; signing algorithm for JWT                     |
| **Migration**           | Process of moving existing v1 data into v2 structure             |
| **Backward Compatible** | v1 clients continue working with no changes                      |

---

**End of SDD Document**

For questions or clarifications, contact the architecture team.
