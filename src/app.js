import express from "express";
import "dotenv/config";
import { commandRouter } from "./router/router.js";
import { validationErrors}  from "./utils/errors.js";
import { corsMiddleware } from "./utils/middlewares/cors.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname}      from 'path';

export const createApp = ({ commandModel }) => {
  console.log('🌱 createApp running')
  const __filename = fileURLToPath(import.meta.url);

  const __dirname  = dirname(__filename);

  
  
  const app = express();

  app.use(express.static(path.join(__dirname, 'web')));

  const PORT = process.env.PORT || 1234;

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(validationErrors);

  app.use(corsMiddleware())


  app.use("/command", commandRouter({ commandModel }));

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};
