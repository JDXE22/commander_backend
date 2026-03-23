# Commander v2 Implementation - Quick Start Guide

**For Developers:** This guide has copy-paste code examples to get you started quickly.

---

## 1. Install Dependencies

```bash
npm install jsonwebtoken bcrypt
```

---

## 2. Update .env File

```bash
# Add these to your .env file

JWT_SECRET=your-super-secret-key-generate-this-randomly-min-32-chars
JWT_EXPIRY=7d
API_VERSION=both
API_SUFFIX=/api/v2
```

**🔐 Generate JWT_SECRET:**

```bash
# Run in Node.js terminal:
require('crypto').randomBytes(32).toString('hex')
# Output: copy and paste into JWT_SECRET
```

---

## 3. Create User Schema (Copy-Paste Ready)

**File:** `backend/src/schemas/mongo-schema/userSchema.js`

```javascript
import mongoose from 'mongoose';

export const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50,
    trim: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /.+\@.+\..+/,
    lowercase: true,
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

// Indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: 1 });
```

---

## 4. Create User Model (Copy-Paste Ready)

**File:** `backend/src/models/mongo/userModel.js`

```javascript
import mongoose from 'mongoose';
import { userSchema } from '../../schemas/mongo-schema/userSchema.js';

export const User = mongoose.model('User', userSchema);
```

---

## 5. Update Command Schema (Copy-Paste Ready)

**File:** `backend/src/schemas/mongo-schema/commandSchema.js`

Update your existing file to look like this:

```javascript
import mongoose from 'mongoose';

export const commandSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        // userId required only in v2 (when in strict mode)
        return process.env.API_VERSION === 'v2';
      },
    },
    name: {
      type: String,
      required: true,
    },
    command: {
      type: String,
      required: true,
    },
    text: {
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
  },
  { timestamps: true },
);

// Composite index: userId + command unique per user
commandSchema.index({ userId: 1, command: 1 }, { unique: true, sparse: true });
commandSchema.index({ userId: 1 });
commandSchema.index({ createdAt: 1 });
```

---

## 6. Create Auth Middleware (Copy-Paste Ready)

**File:** `backend/src/middleware/authMiddleware.js`

```javascript
import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({
        error: 'Missing authorization header',
      });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        error:
          'Invalid authorization format. Use: Authorization: Bearer <token>',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
      });
    }
    return res.status(401).json({
      error: 'Invalid token',
    });
  }
};
```

---

## 7. Create Auth Controller (Copy-Paste Ready)

**File:** `backend/src/controllers/authController.js`

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
        return res.status(400).json({
          error: 'Username, email, and password required',
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters',
        });
      }

      if (username.length < 3) {
        return res.status(400).json({
          error: 'Username must be at least 3 characters',
        });
      }

      // Check if user exists
      const existingUser = await User.findOne({
        $or: [
          { username: username.toLowerCase() },
          { email: email.toLowerCase() },
        ],
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Username or email already registered',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
      });

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          username: user.username,
        },
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

      // Validation
      if (!username || !password) {
        return res.status(400).json({
          error: 'Username and password required',
        });
      }

      // Find user
      const user = await User.findOne({ username: username.toLowerCase() });

      if (!user) {
        return res.status(401).json({
          error: 'Invalid username or password',
        });
      }

      // Check if active
      if (!user.isActive) {
        return res.status(403).json({
          error: 'User account is deactivated',
        });
      }

      // Compare password
      const isValid = await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid username or password',
        });
      }

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          username: user.username,
        },
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

---

## 8. Create Auth Router (Copy-Paste Ready)

**File:** `backend/src/router/authRouter.js`

```javascript
import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';

export const authRouter = ({ userModel }) => {
  const router = Router();
  const authController = new AuthController();

  /**
   * @openapi
   * /api/v2/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       201:
   *         description: User registered successfully, returns JWT token
   *       400:
   *         description: Validation error
   *       409:
   *         description: Username or email already exists
   */
  router.post('/register', (req, res, next) =>
    authController.register(req, res, next),
  );

  /**
   * @openapi
   * /api/v2/auth/login:
   *   post:
   *     summary: Login and get JWT token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful, returns JWT token
   *       401:
   *         description: Invalid credentials
   */
  router.post('/login', (req, res, next) =>
    authController.login(req, res, next),
  );

  return router;
};
```

---

## 9. Update Commands Controller for v2 (Copy-Paste Ready)

**File:** Update `backend/src/controllers/commandsController.js`

**Key Updates to Each Method:**

### List Method (GET /api/v2/commands)

```javascript
async list(req, res, next) {
  try {
    const { userId } = req.user;  // ⭐ From JWT middleware
    const { trigger, page = 1, limit = 5 } = req.query;

    // If trigger provided, search with userId filter
    if (trigger) {
      const command = await this.commandModel.findOne({
        userId,
        command: trigger
      });
      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }
      return res.json(command);
    }

    // Otherwise list all user's commands with pagination
    const skip = (page - 1) * limit;
    const commands = await this.commandModel
      .find({ userId })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await this.commandModel.countDocuments({ userId });
    const totalPages = Math.ceil(total / limit);

    res.json({
      commands,
      totalPages,
      currentPage: parseInt(page)
    });
  } catch (err) {
    next(err);
  }
}
```

### Create Method (POST /api/v2/commands)

```javascript
async create(req, res, next) {
  try {
    const { userId } = req.user;  // ⭐ From JWT middleware
    const { name, command, text } = req.body;

    // Validation
    if (!name || !command || !text) {
      return res.status(400).json({
        error: 'Name, command, and text are required'
      });
    }

    // Check for duplicate command per user
    const existing = await this.commandModel.findOne({
      userId,
      command
    });
    if (existing) {
      return res.status(409).json({
        error: 'You already have a command with this trigger'
      });
    }

    // Create command with userId
    const newCommand = await this.commandModel.create({
      userId,  // ⭐ CRITICAL: Auto-set from JWT
      name,
      command,
      text
    });

    res.status(201).json(newCommand);
  } catch (err) {
    next(err);
  }
}
```

### GetById Method (GET /api/v2/commands/:id)

```javascript
async getById(req, res, next) {
  try {
    const { id } = req.params;
    const { userId } = req.user;  // ⭐ From JWT middleware

    const command = await this.commandModel.findById(id);

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // ⭐ CRITICAL: Check ownership
    if (command.userId.toString() !== userId) {
      return res.status(403).json({
        error: 'Not authorized to access this command'
      });
    }

    res.json(command);
  } catch (err) {
    next(err);
  }
}
```

### Update Method (PATCH /api/v2/commands/:id)

```javascript
async update(req, res, next) {
  try {
    const { id } = req.params;
    const { userId } = req.user;  // ⭐ From JWT middleware
    const updates = req.body;

    const command = await this.commandModel.findById(id);

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // ⭐ CRITICAL: Check ownership
    if (command.userId.toString() !== userId) {
      return res.status(403).json({
        error: 'Not authorized to update this command'
      });
    }

    // ⭐ CRITICAL: Prevent userId modification
    delete updates.userId;

    // Add updated timestamp
    updates.updatedAt = new Date();

    const updated = await this.commandModel.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
```

### Delete Method (DELETE /api/v2/commands/:id)

```javascript
async delete(req, res, next) {
  try {
    const { id } = req.params;
    const { userId } = req.user;  // ⭐ From JWT middleware

    const command = await this.commandModel.findById(id);

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // ⭐ CRITICAL: Check ownership
    if (command.userId.toString() !== userId) {
      return res.status(403).json({
        error: 'Not authorized to delete this command'
      });
    }

    await this.commandModel.deleteOne({ _id: id });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
```

---

## 10. Create v2 Commands Router (Copy-Paste Ready)

**File:** `backend/src/router/commandsRouter_v2.js`

```javascript
import { Router } from 'express';
import { CommandController } from '../controllers/commandsController.js';

export const commandsRouter_v2 = ({ commandModel }) => {
  const router = Router();
  const commandController = new CommandController({ commandModel });

  /**
   * @openapi
   * /api/v2/commands:
   *   get:
   *     summary: List all commands for authenticated user
   *     tags: [Commands v2]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: trigger
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: List of user's commands
   *       401:
   *         description: Unauthorized
   */
  router.get('/', (req, res, next) => commandController.list(req, res, next));

  /**
   * @openapi
   * /api/v2/commands:
   *   post:
   *     summary: Create a new command
   *     tags: [Commands v2]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               command:
   *                 type: string
   *               text:
   *                 type: string
   *     responses:
   *       201:
   *         description: Command created
   *       401:
   *         description: Unauthorized
   */
  router.post('/', (req, res, next) =>
    commandController.create(req, res, next),
  );

  /**
   * @openapi
   * /api/v2/commands/{id}:
   *   get:
   *     summary: Get a single command
   *     tags: [Commands v2]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Command details
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Not your command
   *       404:
   *         description: Command not found
   */
  router.get('/:id', (req, res, next) =>
    commandController.getById(req, res, next),
  );

  /**
   * @openapi
   * /api/v2/commands/{id}:
   *   patch:
   *     summary: Update a command
   *     tags: [Commands v2]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Command updated
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Not your command
   */
  router.patch('/:id', (req, res, next) =>
    commandController.update(req, res, next),
  );

  /**
   * @openapi
   * /api/v2/commands/{id}:
   *   delete:
   *     summary: Delete a command
   *     tags: [Commands v2]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Command deleted
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Not your command
   */
  router.delete('/:id', (req, res, next) =>
    commandController.delete(req, res, next),
  );

  return router;
};
```

---

## 11. Update app.js (Copy-Paste Ready)

**File:** `backend/src/app.js`

```javascript
import express from 'express';
import 'dotenv/config';
import { commandRouter } from './router/router.js';
import { authRouter } from './router/authRouter.js';
import { commandsRouter_v2 } from './router/commandsRouter_v2.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { errorHandler } from './utils/errors.js';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
};

export const createApp = ({ commandModel, userModel }) => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ==================== v2 AUTH (NO AUTH REQUIRED) ====================
  app.use('/api/v2/auth', authRouter({ userModel }));

  // ==================== v1 & v2 ROUTING ====================
  const apiVersion = process.env.API_VERSION || 'v2';

  // v1 endpoints (legacy - no authentication)
  if (apiVersion === 'v1' || apiVersion === 'both') {
    app.use('/api/commands', commandRouter({ commandModel }));
    app.use('/api/v1/commands', commandRouter({ commandModel }));
    console.log('✅ v1 API enabled at /api/commands and /api/v1/commands');
  }

  // v2 endpoints (new - requires authentication)
  if (apiVersion === 'v2' || apiVersion === 'both') {
    app.use(
      '/api/v2/commands',
      authMiddleware,
      commandsRouter_v2({ commandModel }),
    );
    console.log('✅ v2 API enabled at /api/v2/commands (authenticated)');
  }

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
};
```

---

## 12. Update mongo-db.js Entry Point (Copy-Paste Ready)

**File:** `backend/src/mongo-db.js`

Add userModel to the app initialization:

```javascript
import mongoose from 'mongoose';
import 'dotenv/config';
import { createApp } from './app.js';
import { Command } from './models/mongo/commandModel.js';
import { User } from './models/mongo/userModel.js'; // ⭐ ADD THIS

const startServer = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // ⭐ PASS userModel TO APP
    const app = createApp({ commandModel: Command, userModel: User });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
```

---

## 13. Create Migration Script (Copy-Paste Ready)

**File:** `backend/scripts/migrate-v1-to-v2.js`

```javascript
import mongoose from 'mongoose';
import 'dotenv/config';
import { User } from '../src/models/mongo/userModel.js';
import { Command } from '../src/models/mongo/commandModel.js';
import bcrypt from 'bcrypt';

const migrate = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Step 1: Check if migration was already done
    const existingMigrationUser = await User.findOne({ isMigrationUser: true });
    if (existingMigrationUser) {
      console.log('⚠️  Migration user already exists. Skipping migration.');
      console.log(`Migration user ID: ${existingMigrationUser._id}`);
      await mongoose.disconnect();
      return;
    }

    // Step 2: Create migration user
    console.log('📝 Creating migration user...');
    const tempPassword = await bcrypt.hash(
      'TEMP_SECURE_PASS_' + Date.now(),
      10,
    );
    const migrationUser = await User.create({
      username: 'legacy_v1_owner',
      email: 'legacy@commander.local',
      passwordHash: tempPassword,
      isMigrationUser: true,
    });
    console.log(`✅ Migration user created: ${migrationUser._id}`);

    // Step 3: Count commands without userId
    const countBefore = await Command.countDocuments({
      userId: { $exists: false },
    });
    console.log(`\n📊 Found ${countBefore} commands without userId`);

    if (countBefore === 0) {
      console.log('✅ All commands already have userId. Nothing to migrate.');
      await mongoose.disconnect();
      return;
    }

    // Step 4: Assign all v1 commands to migration user
    console.log(`🔄 Assigning ${countBefore} commands to migration user...`);
    const result = await Command.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: migrationUser._id } },
    );

    console.log(`✅ Updated ${result.modifiedCount} commands`);

    // Step 5: Verify migration
    const countAfter = await Command.countDocuments({
      userId: { $exists: false },
    });
    if (countAfter > 0) {
      console.log(`⚠️  FAILED: ${countAfter} commands still don't have userId`);
      process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('📝 Important: Save this migration user ID in your records:');
    console.log(`   Migration User ID: ${migrationUser._id}`);
    console.log(`   Username: legacy_v1_owner`);
    console.log('\n💡 Old commands are now owned by the migration user.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔓 Disconnected from MongoDB');
  }
};

// Run migration
migrate();
```

**To run migration:**

```bash
node backend/scripts/migrate-v1-to-v2.js
```

---

## 14. Test the API (cURL Examples)

### Register a new user:

```bash
curl -X POST http://localhost:3000/api/v2/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**

```json
{
  "_id": "507f191e810c19729de860ea",
  "username": "john_doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login:

```bash
curl -X POST http://localhost:3000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123!"
  }'
```

### Create a command (⭐ Requires auth):

```bash
# Save the token from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:3000/api/v2/commands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Hello Command",
    "command": "/hello",
    "text": "Hello, world!"
  }'
```

### List user's commands:

```bash
curl -X GET http://localhost:3000/api/v2/commands \
  -H "Authorization: Bearer $TOKEN"
```

### Get command by ID:

```bash
curl -X GET http://localhost:3000/api/v2/commands/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer $TOKEN"
```

### Update command:

```bash
curl -X PATCH http://localhost:3000/api/v2/commands/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "Updated response!"
  }'
```

### Delete command:

```bash
curl -X DELETE http://localhost:3000/api/v2/commands/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 15. Troubleshooting

| Problem                        | Solution                                                              |
| ------------------------------ | --------------------------------------------------------------------- |
| "Invalid authorization header" | Make sure header is: `Authorization: Bearer <TOKEN>` (case-sensitive) |
| "Invalid token"                | Token might be expired. Get a new one with login.                     |
| "Not authorized" (403)         | You don't own this command. Check command ID is correct.              |
| "Duplicate key error"          | You already have a command with that trigger. Use different one.      |
| Token not being validated      | Check JWT_SECRET matches in .env and code.                            |
| MongoDB connection error       | Check MONGODB_URI is correct in .env                                  |
| "Cannot find User model"       | Verify User model is imported correctly in mongo-db.js                |

---

## 16. Expected Error Responses

### 400 Bad Request

```json
{ "error": "Username, email, and password required" }
```

### 401 Unauthorized (Missing/Invalid Token)

```json
{ "error": "Missing authorization header" }
```

### 403 Forbidden (Not Owner)

```json
{ "error": "Not authorized to access this command" }
```

### 404 Not Found

```json
{ "error": "Command not found" }
```

### 409 Conflict (Duplicate)

```json
{ "error": "You already have a command with this trigger" }
```

---

**Next Steps:**

1. Follow steps 1-12 in order
2. Run migration script (step 13)
3. Test endpoints (step 14)
4. Monitor errors (step 15 & 16)

Good luck! 🚀
