import express from 'express';
import 'dotenv/config';
import { commandRouter } from './router/router.js';
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

export const createApp = ({ commandModel }) => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api/commands', commandRouter({ commandModel }));

  app.use(errorHandler);

  return app;
};
