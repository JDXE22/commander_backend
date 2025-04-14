import { createApp } from "./app.js";
import { CommandModel as NewMongoModel } from "./models/mongo/CommandModel.js";

createApp({ commandModel: new NewMongoModel()})