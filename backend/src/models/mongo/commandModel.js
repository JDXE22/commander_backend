import mongoose from 'mongoose';
import { commandSchema } from '../../schemas/mongo-schema/commandSchema.js';
import { URL } from '../../config/config.js';

const clientOptions = {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
};

async function connect() {
  try {
    await mongoose.connect(URL, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
  } catch (error) {
    console.error('Error connecting to the database');
    console.error(error);
    await mongoose.disconnect();
  }
}

const commandMongooseModel = mongoose.model(
  'command',
  commandSchema,
  'commands',
);
connect();
export class CommandModel {
  getAll = async ({ query }) => {
    const { limit, page } = query;

    const currentLimit = limit ? parseInt(limit) : 5;
    const currentPage = page ? parseInt(page) : 1;
    const skip = (currentPage - 1) * currentLimit;
    const result = await commandMongooseModel
      .find()
      .skip(skip)
      .limit(currentLimit);
    const total = await commandMongooseModel.countDocuments();
    const totalPages = Math.ceil(total / currentLimit);

    return {
      commands: result,
      totalPages,
    };
  };

  getById = async ({ id }) => {
    return commandMongooseModel.findById(id);
  };

  getByCommand = async ({ command }) => {
    const result = await commandMongooseModel.findOne({ command });
    return result ?? null;
  };

  createCommand = async ({ input }) => {
    const commandExists = await commandMongooseModel.findOne({
      command: input.command,
    });

    if (commandExists) {
      const error = new Error('A command with this trigger already exists');
      error.name = 'ConflictError';
      throw error;
    }

    const command = new commandMongooseModel(input);
    return command.save();
  };

  updateCommand = async ({ id, input }) => {
    const updated = await commandMongooseModel.findByIdAndUpdate(id, input, {
      new: true,
    });

    if (!updated) {
      const error = new Error('Command not found');
      error.name = 'NotFoundError';
      throw error;
    }

    return updated;
  };

  delete = async ({ id }) => {
    const deleted = await commandMongooseModel.findByIdAndDelete(id);

    if (!deleted) {
      const error = new Error('Command not found');
      error.name = 'NotFoundError';
      throw error;
    }

    return { message: 'Command deleted successfully' };
  };
}
