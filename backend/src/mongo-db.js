import { createApp } from "./app.js";
import { CommandModel } from "./models/mongo/commandModel.js";

createApp({ commandModel: new CommandModel()})