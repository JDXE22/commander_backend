import mongoose from "mongoose";
import { commandSchema } from "../../schemas/mongo-schema/commandSchema.js";

const url = process.env.DATABASE_URL;
const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};

async function connect() {
  try {
    await mongoose.connect(url, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to the database");
    console.error(error);
    await mongoose.disconnect();
  }
}

const commandMongooseModel = mongoose.model("Command", commandSchema, "commands");

export class CommandModel {
  getAll = async () => {
    await connect();

    const result = await commandMongooseModel.find({});

    return result;
  };

  // getById = async ({ id }) => {
  //   const db = await connect();
  //   const objectId = ObjectId.createFromHexString(id);
  //   console.log(objectId);

  //   return db.findOne({ _id: objectId });
  // };

  // getByCommand = async ({ command }) => {
  //   const db = await connect()
  //   if(command){
  //     return db.find({
  //       command: {
  //         $match: command,
  //         $options: "i"
  //       }
  //     }).toArray()
  //   }
  //   return db.find({}).toArray()
  // };

  //   createCommand = ({ input }) => {
  //     const newCommand = {
  //       id: commands.length + 1,
  //       ...input,
  //     };

  //     commands.push(newCommand);

  //     return newCommand;
  //   };

  //   updateCommand = ({ id, input }) => {
  //     const commandIndex = commands.findIndex((cmd) => cmd.id === id);
  //     if (commandIndex !== -1) {
  //       commands[commandIndex] = {
  //         ...commands[commandIndex],
  //         ...input,
  //       };
  //       return commands[commandIndex];
  //     }
  //   };

  //   delete = ({ id }) => {
  //     const commandById = commands.findIndex((cmd) => cmd.id === id);
  //     if (commandById === -1) return false;
  //     commands.splice(commandById, 1);

  //     return { message: `Command has been deleted successfully` };
  //   };
}
