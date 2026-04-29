import { Router } from 'express';
import { CommandController } from '../controllers/commandsController.js';
import { AuthController } from '../controllers/authController.js';
import { getHealth } from '../controllers/healthController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { doubleCsrfProtection } from '../middleware/csrfMiddleware.js';
import { byTrigger } from '../middleware/triggerMiddleware.js';
import {
  validateRegisterInput,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateResetPasswordBodyInput,
} from '../middleware/authValidation.js';

/**
 * Creates the main API router for the application.
 * Consolidates v1 and v2 routes into a single version-aware entry point.
 */
export const createRouter = ({
  commandModel,
  userModel,
  refreshTokenModel,
}) => {
  const rootRouter = Router();
  const commandController = new CommandController({ commandModel });
  const apiVersion = process.env.API_VERSION || 'both';
  const isV2 = apiVersion === 'v2' || apiVersion === 'both';

  const byTriggerMiddleware = byTrigger(commandController.getByCommand);

  /**
   * @openapi
   * /api/health:
   *   get:
   *     summary: Health check
   *     description: Returns a simple JSON response to confirm the backend service is running.
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Service is healthy.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   */
  rootRouter.get('/health', getHealth);

  // 2. v2 Authentication (only when v2 is active and userModel is available)
  if (isV2 && userModel) {
    const authController = new AuthController({ userModel, refreshTokenModel });
    const v2AuthRouter = Router();

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
     *             $ref: "#/components/schemas/RegisterInput"
     *     responses:
     *       201:
     *         description: User registered successfully.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: "#/components/schemas/AuthResponse"
     *       409:
     *         description: User already exists.
     *       400:
     *         description: Bad request.
     */
    v2AuthRouter.post(
      '/register',
      validateRegisterInput,
      authController.register,
    );

    /**
     * @openapi
     * /api/v2/auth/login:
     *   post:
     *     summary: Login with email and receive JWT token
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Login successful.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: "#/components/schemas/AuthResponse"
     *       401:
     *         description: Invalid credentials.
     */
    v2AuthRouter.post('/login', validateLoginInput, authController.login);

    /**
     * @openapi
     * /api/v2/auth/forgot-password:
     *   post:
     *     summary: Request a password reset
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *     responses:
     *       200:
     *         description: Reset email sent (if account exists).
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     */
    v2AuthRouter.post(
      '/forgot-password',
      validateForgotPasswordInput,
      authController.forgotPassword,
    );

    /**
     * @openapi
     * /api/v2/auth/reset-password/{token}:
     *   post:
     *     summary: Reset password using token
     *     tags: [Auth]
     *     parameters:
     *       - in: path
     *         name: token
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               newPassword:
     *                 type: string
     *                 minLength: 8
     *     responses:
     *       200:
     *         description: Password reset successful.
     *       400:
     *         description: Invalid token or password.
     */
    v2AuthRouter.post(
      '/reset-password/:token',
      validateResetPasswordInput,
      authController.resetPassword,
    );

    /**
     * @openapi
     * /api/v2/auth/password-resets:
     *   post:
     *     summary: Reset password using token in body
     *     description: New endpoint for non-logged in users following RESTful naming (no verbs) and providing token in body for better security.
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - token
     *               - newPassword
     *             properties:
     *               token:
     *                 type: string
     *               newPassword:
     *                 type: string
     *                 minLength: 8
     *     responses:
     *       200:
     *         description: Password reset successful.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       400:
     *         description: Invalid token or password.
     */
    v2AuthRouter.post(
      '/password-resets',
      validateResetPasswordBodyInput,
      authController.resetPasswordWithBody,
    );

    /**
     * @openapi
     * /api/v2/auth/refresh:
     *   post:
     *     summary: Refresh access token using RT cookie
     *     description: Issues a new access token and rotates the refresh token. Requires a valid x-csrf-token header and __rt cookie.
     *     tags: [Auth]
     *     parameters:
     *       - in: header
     *         name: x-csrf-token
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: New access token issued.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 accessToken:
     *                   type: string
     *       401:
     *         description: Invalid, expired, or consumed refresh token.
     *       403:
     *         description: CSRF validation failed.
     */
    v2AuthRouter.post('/refresh', doubleCsrfProtection, authController.refresh);

    /**
     * @openapi
     * /api/v2/auth/logout:
     *   post:
     *     summary: Logout from current device
     *     description: Deletes the current refresh token and clears auth cookies.
     *     security: [{ bearerAuth: [] }]
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Logged out successfully.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       401:
     *         description: Unauthorized.
     */
    v2AuthRouter.post('/logout', authMiddleware, authController.logout);

    /**
     * @openapi
     * /api/v2/auth/logout-all:
     *   post:
     *     summary: Logout from all devices
     *     description: Revokes all refresh token families for the authenticated user.
     *     security: [{ bearerAuth: [] }]
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: All sessions terminated.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       401:
     *         description: Unauthorized.
     */
    v2AuthRouter.post('/logout-all', authMiddleware, authController.logoutAll);

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      /**
       * @openapi
       * /api/v2/auth/google:
       *   get:
       *     summary: Initiate Google OAuth sign-in
       *     description: Redirects the user to Google's OAuth consent screen. Sets a short-lived httpOnly state cookie for CSRF protection.
       *     tags: [Auth]
       *     responses:
       *       302:
       *         description: Redirect to Google consent screen.
       */
      v2AuthRouter.get('/google', authController.googleRedirect);

      /**
       * @openapi
       * /api/v2/auth/google/callback:
       *   get:
       *     summary: Google OAuth callback
       *     description: Receives the authorization code from Google, validates state, resolves/creates user, issues RT+CSRF cookies, and redirects to the frontend.
       *     tags: [Auth]
       *     parameters:
       *       - in: query
       *         name: code
       *         required: true
       *         schema:
       *           type: string
       *       - in: query
       *         name: state
       *         required: true
       *         schema:
       *           type: string
       *     responses:
       *       302:
       *         description: Redirect to frontend on success, or to login page with error on failure.
       */
      v2AuthRouter.get('/google/callback', authController.googleCallback);
    }

    rootRouter.use('/v2/auth', v2AuthRouter);
  }

  // 3. v1 Commands (Legacy, unauthenticated)
  if (apiVersion === 'v1' || apiVersion === 'both') {
    const v1CommandsRouter = Router();

    /**
     * @openapi
     * /api/commands:
     *   get:
     *     summary: Get all commands (v1)
     *     description: Retrieve all commands available in the legacy v1 public space.
     *     tags: [Commands v1]
     *     responses:
     *       200:
     *         description: Paginated list of v1 commands.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: "#/components/schemas/CommandsPage"
     */
    v1CommandsRouter.get('/', byTriggerMiddleware, commandController.getAll);

    /**
     * @openapi
     * /api/commands/{id}:
     *   get:
     *     summary: Get v1 command by ID
     *     tags: [Commands v1]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     */
    v1CommandsRouter.get('/:id', commandController.getById);

    /**
     * @openapi
     * /api/commands:
     *   post:
     *     summary: Create command (v1)
     *     tags: [Commands v1]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: "#/components/schemas/CommandCreateInput"
     */
    v1CommandsRouter.post('/', commandController.create);
    v1CommandsRouter.patch('/:id', commandController.update);
    v1CommandsRouter.delete('/:id', commandController.delete);

    rootRouter.use('/commands', v1CommandsRouter);
  }

  // 4. v2 Commands (Authenticated)
  if (apiVersion === 'v2' || apiVersion === 'both') {
    const v2CommandsRouter = Router();
    v2CommandsRouter.use(authMiddleware);

    /**
     * @openapi
     * /api/v2/commands:
     *   get:
     *     summary: Get user-scoped commands (v2)
     *     description: Retrieve commands belonging to the authenticated user.
     *     security: [{ bearerAuth: [] }]
     *     tags: [Commands v2]
     *     responses:
     *       200:
     *         description: Paginated list of the authenticated user's commands.
     *         content:
     *           application/json:
     *             schema:
     *               $ref: "#/components/schemas/CommandsPage"
     */
    v2CommandsRouter.get('/', byTriggerMiddleware, commandController.getAll);

    /**
     * @openapi
     * /api/v2/commands/search:
     *   get:
     *     summary: Search user-scoped templates
     *     description: Search authenticated user's templates by keyword or command with case-insensitive matching.
     *     security: [{ bearerAuth: [] }]
     *     tags: [Commands v2]
     *     parameters:
     *       - in: query
     *         name: query
     *         required: true
     *         schema:
     *           type: string
     *           minLength: 1
     *           maxLength: 100
     *         description: Search query (keyword or /command)
     *       - in: query
     *         name: limit
     *         required: false
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 20
     *           default: 8
     *         description: Maximum results to return
     *     responses:
     *       200:
     *         description: List of matching templates for suggestions.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 query:
     *                   type: string
     *                 limit:
     *                   type: integer
     *                 total:
     *                   type: integer
     *                 templates:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: string
     *                       name:
     *                         type: string
     *                       content:
     *                         type: string
     *                       command:
     *                         type: string
     *                       match:
     *                         type: string
     *       400:
     *         description: Invalid query parameters
     *       401:
     *         description: Unauthorized
     */
    v2CommandsRouter.get('/search', commandController.search);

    /**
     * @openapi
     * /api/v2/commands/{id}:
     *   get:
     *     summary: Get v2 command by ID
     *     security: [{ bearerAuth: [] }]
     *     tags: [Commands v2]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     */
    v2CommandsRouter.get('/:id', commandController.getById);

    /**
     * @openapi
     * /api/v2/commands:
     *   post:
     *     summary: Create user-scoped command (v2)
     *     security: [{ bearerAuth: [] }]
     *     tags: [Commands v2]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: "#/components/schemas/CommandCreateInput"
     */
    v2CommandsRouter.post('/', commandController.create);

    /**
     * @openapi
     * /api/v2/commands/{id}:
     *   patch:
     *     summary: Update v2 command
     *     security: [{ bearerAuth: [] }]
     *     tags: [Commands v2]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     */
    v2CommandsRouter.patch('/:id', commandController.update);

    /**
     * @openapi
     * /api/v2/commands/{id}:
     *   delete:
     *     summary: Delete v2 command
     *     security: [{ bearerAuth: [] }]
     *     tags: [Commands v2]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     */
    v2CommandsRouter.delete('/:id', commandController.delete);

    rootRouter.use('/v2/commands', v2CommandsRouter);
  }

  return rootRouter;
};
