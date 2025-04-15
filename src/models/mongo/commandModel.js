
import mongoose from "mongoose";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

const uri = process.env.DATABASE_URL
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    }
})

async function connect() {
  try {
    await mongoose.connect(uri, client);
    await mongoose.connection.db.admin().command({ ping: 1})
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to the database");
    console.error(error);
    await mongoose.disconnect();
  }
}

export class CommandModel {
  // getAll = async () => {
  //   const db = await connect();

  //   return 
  // };

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
 