import express from 'express';
import 'dotenv/config';
import { commandRouter, healthRouter } from './router/router.js';
import { authRouter } from './router/authRouter.js';
import { commandRouter_v2 } from './router/commandsRouter_v2.js';
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

  // Health check
  app.use('/api/health', healthRouter());

  // v2 Auth endpoints
  app.use('/api/v2/auth', authRouter({ userModel }));

  // v1 Commands (legacy, no auth) - Versioning controlled by API_VERSION env
  const apiVersion = process.env.API_VERSION || 'both';
  if (apiVersion === 'v1' || apiVersion === 'both') {
    app.use('/api/commands', commandRouter({ commandModel }));
  }

  // v2 Commands (requires auth)
  if (apiVersion === 'v2' || apiVersion === 'both') {
    app.use('/api/v2/commands', authMiddleware, commandRouter_v2({ commandModel }));
  }

  app.use(errorHandler);

  return app;
};
