# Commander Backend

Commander Backend is a modular Express API for storing and resolving command-based text snippets such as `/hello` or `/hi1`.

Starting with **v2**, it supports multi-user data ownership, allowing users to privately manage their own commands.

| Features
|
| - **Multi-user Support (v2)**: Private command namespaces per user.
| - **Authentication**: Secure registration and login using JWT (JSON Web Tokens) and optional Google OAuth (if configured).
| - **Bifurcated Authentication**: Dual-token system with short-lived Access Tokens (15-min) and long-lived Refresh Tokens (7-day httpOnly cookies). Silent refresh on expiry, token rotation, theft detection, and logout-all functionality.
| - **Password Recovery**: Integrated "Forgot Password" flow via email with REST-compliant token validation.
| - **API Versioning**: Coexistence of v1 (legacy shared) and v2 (authenticated) routes.
| - **Command Management**: Create, read, update, and delete command snippets.
| - **Template Search (v2)**: Full-text search across user's templates by command or keyword with relevance ranking.
| - **Trigger Resolution**: Resolve a snippet by trigger through `/api/v2/commands?trigger=...`.
| - **Health Check**: Dedicated `/api/health` endpoint for monitoring.
| - **Swagger Documentation**: Interactive API docs available at `/api-docs`.
| - **CORS**: Credentials-enabled CORS with explicit `FRONTEND_URL` origin and `x-csrf-token` header support.
| - **CSRF Protection**: Stateless HMAC-signed Double-Submit Cookie pattern on sensitive endpoints.

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

Copy the provided `.env.example` file in the `backend` directory to `.env` and fill in your secrets and configuration values:

```bash
cp backend/.env.example backend/.env
```

Edit `.env` as needed. See comments in `.env.example` for descriptions of each variable.

> **Note:**
>
> - Google OAuth is optional. If the Google variables are not set, Google sign-in routes are not mounted.
> - `FRONTEND_URL` must be an explicit origin (not `*`) for CORS with credentials.

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
- **Google OAuth Spec & Plan**: [specs/google-oauth/](./specs/google-oauth/)
- **Bifurcated Authentication Spec**: [specs/bifurcated-auth/](./specs/bifurcated-auth/)
- **Detailed Design (v2)**: [specs/app-version/SDD_v2.md](./specs/app-version/SDD_v2.md)

## License

ISC
