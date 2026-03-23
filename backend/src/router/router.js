import { Router } from 'express';
import { CommandController } from '../controllers/commandsController.js';
import { AuthController } from '../controllers/authController.js';
import { getHealth } from '../controllers/healthController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

/**
 * Creates the main API router for the application.
 * Consolidates v1 and v2 routes into a single version-aware entry point.
 */
export const createRouter = ({ commandModel, userModel }) => {
  const rootRouter = Router();
  const commandController = new CommandController({ commandModel });
  const authController = new AuthController({ userModel });

  // 1. Health check (version-agnostic)
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
   */
  rootRouter.get('/health', getHealth);

  // 2. v2 Authentication
  const v2AuthRouter = Router();
  v2AuthRouter.post('/register', authController.register);
  v2AuthRouter.post('/login', authController.login);
  rootRouter.use('/v2/auth', v2AuthRouter);

  // 3. v1 Commands (Legacy, unauthenticated)
  const apiVersion = process.env.API_VERSION || 'both';
  if (apiVersion === 'v1' || apiVersion === 'both') {
    const v1CommandsRouter = Router();
    
    const byTrigger = (req, res, next) => {
      if (req.query.trigger) return commandController.getByCommand(req, res, next);
      next();
    };

    /**
     * @openapi
     * /api/commands:
     *   get:
     *     summary: Get all commands (v1)
     *     tags: [Commands]
     */
    v1CommandsRouter.get('/', byTrigger, commandController.getAll);
    v1CommandsRouter.get('/:id', commandController.getById);
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
     *     security: [{ bearerAuth: [] }]
     *     tags: [Commands V2]
     */
    v2CommandsRouter.get('/', commandController.getAll);
    v2CommandsRouter.get('/:id', commandController.getById);
    v2CommandsRouter.post('/', commandController.create);
    v2CommandsRouter.patch('/:id', commandController.update);
    v2CommandsRouter.delete('/:id', commandController.delete);

    rootRouter.use('/v2/commands', v2CommandsRouter);
  }

  return rootRouter;
};
