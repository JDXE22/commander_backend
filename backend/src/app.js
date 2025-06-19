import express from "express";
import "dotenv/config";
import { commandRouter } from "./router/router.js";
import { errorHandler } from "./utils/errors.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { PORT } from "./config/config.js";

export const createApp = ({ commandModel }) => {
  console.log("🌱 createApp running");

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use("/command", commandRouter({ commandModel }));

  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};
