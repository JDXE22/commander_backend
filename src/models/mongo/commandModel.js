import mongoose from "mongoose";
import { commandSchema } from "../../schemas/mongo-schema/commandSchema.js";

const url = process.env.DATABASE_URL;
const clientOptions = {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true,
  },
};

async function connect() {
  try {
    await mongoose.connect(url, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
  } catch (error) {
    console.error("Error connecting to the database");
    console.error(error);
    await mongoose.disconnect();
  }
}

const commandMongooseModel = mongoose.model(
  "command",
  commandSchema,
  "commands"
);

connect().then(() => console.log("Connection established."));

export class CommandModel {
  getAll = async () => {
    const result = await commandMongooseModel.find({});

    return result;
  };

  getById = async ({ id }) => {
    const commandId = String(id)

    if (!mongoose.Types.ObjectId.isValid(commandId)) {
      console.log("The id is not a valid ObjectId");
      return null;
    }

    const result = await commandMongooseModel.findById(commandId);

    return result;
  };

  getByCommand = async ({ command }) => {
    const result = await commandMongooseModel.find({command})

    return result;
  };

    createCommand = async ({ input }) => {
      const command = new commandMongooseModel(input)

      const result = await command.save()

      return result;
    };

    updateCommand = async ({ id, input }) => {
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log("The id is not a valid ObjectId");
        return null;
      }

      const updatedCommand = await commandMongooseModel.updateOne({_id: id}, input)

      return updatedCommand
      
    };

    delete = async ({ id }) => {

      const commandId = String(id)

      if (!mongoose.Types.ObjectId.isValid(commandId)) {
        console.log("The id is not a valid ObjectId");
        return null;
      }

      const command = await commandMongooseModel.findByIdAndDelete(commandId)

      return {message: `The command has been deleted:`}
    };
}
