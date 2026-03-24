import express from 'express';
import 'dotenv/config';
import { createRouter } from './router/router.js';
import { errorHandler } from './utils/errors.js';
import { requestLogger } from './middleware/loggerMiddleware.js';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

export const createApp = ({ commandModel, userModel }) => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api', createRouter({ commandModel, userModel }));

  app.use(errorHandler);

  return app;
};
