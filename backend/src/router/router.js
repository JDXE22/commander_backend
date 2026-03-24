import { Router } from 'express';
import { CommandController } from '../controllers/commandsController.js';
import { AuthController } from '../controllers/authController.js';
import { getHealth } from '../controllers/healthController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { byTrigger } from '../middleware/triggerMiddleware.js';

/**
 * Creates the main API router for the application.
 * Consolidates v1 and v2 routes into a single version-aware entry point.
 */
export const createRouter = ({ commandModel, userModel }) => {
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
    const authController = new AuthController({ userModel });
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
    v2AuthRouter.post('/register', authController.register);

    /**
     * @openapi
     * /api/v2/auth/login:
     *   post:
     *     summary: Login and receive JWT token
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: "#/components/schemas/LoginInput"
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
    v2AuthRouter.post('/login', authController.login);
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
