# Commander Backend

Commander Backend is a modular Express API for storing and resolving command-based text snippets such as `/hello` or `/hi1`.

Starting with **v2**, it supports multi-user data ownership, allowing users to privately manage their own commands.

## Features

- **Multi-user Support (v2)**: Private command namespaces per user.
- **Authentication**: Secure registration and login using JWT (JSON Web Tokens).
- **Password Recovery**: Integrated "Forgot Password" flow via email.
- **API Versioning**: Coexistence of v1 (legacy shared) and v2 (authenticated) routes.
- **Command Management**: Create, read, update, and delete command snippets.
- **Trigger Resolution**: Resolve a snippet by trigger through `/api/v2/commands?trigger=...`.
- **Health Check**: Dedicated `/api/health` endpoint for monitoring.
- **Swagger Documentation**: Interactive API docs available at `/api-docs`.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express 5
- **Database**: MongoDB with Mongoose
- **Security**: JWT for auth, Bcrypt for password hashing
- **Email**: Nodemailer for password reset services
- **Documentation**: Swagger/OpenAPI 3.0

## Quick Start

```bash
git clone https://github.com/JDXE22/commander_backend.git
cd commander_backend/backend
npm install
```

### Environment Configuration

Create a `.env` file inside the `backend` directory:

```env
PORT=1234
DATABASE_URL=mongodb://127.0.0.1:27017/commander

# API Versioning (v1, v2, or both)
API_VERSION=both

# JWT Configuration
JWT_SECRET=your_super_secret_key

# SMTP Configuration (for Forgot Password)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
EMAIL_FROM="Commander <noreply@example.com>"

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
```

### Running the Server

Start the MongoDB-backed server:

```bash
npm start
```

## Scripts

| Command                          | Description                                       |
| -------------------------------- | ------------------------------------------------- |
| `npm start`                      | Start the server with MongoDB (watch mode)        |
| `npm run verify-forgot-password` | Run integration tests for the password reset flow |
| `npm run test-email-config`      | Validate the SMTP configuration                   |

## Documentation

- **Architecture & API Reference**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Example Requests**: [backend/api.http](./backend/api.http)
- **Detailed Design (v2)**: [specs/app-version/SDD_v2.md](./specs/app-version/SDD_v2.md)

## License

ISC
