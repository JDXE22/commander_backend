import express from "express";
import "dotenv/config";
import { commandRouter } from "./router/router.js";
import { errorHandler } from "./utils/errors.js";
import cors from "cors";
import { PORT } from "./config/config.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

export const createApp = ({ commandModel }) => {
  console.log("🌱 createApp running");

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use("/api/commands", commandRouter({ commandModel }));

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};
