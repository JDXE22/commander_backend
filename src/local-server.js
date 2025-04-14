import { createApp } from "./app.js";
import { CommandModel } from "./models/local-system/commandModel.js";

createApp({ commandModel: new CommandModel()})