import mongoose from 'mongoose';
import { commandSchema } from '../../schemas/mongo-schema/commandSchema.js';
import { URL } from '../../config/config.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';

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

/**
 * Builds a Mongoose filter object.
 * userId is only included when defined — omitting it preserves v1 semantics
 * (query all commands) while v2 scopes results to the authenticated user.
 */
const buildFilter = (base = {}, userId) =>
  userId !== undefined ? { ...base, userId } : base;

export class CommandModel {
  getAll = async ({ userId, query }) => {
    const { limit, page } = query;

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);

    const currentLimit =
      !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;
    const currentPage = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const skip = (currentPage - 1) * currentLimit;

    const filter = buildFilter({}, userId);

    const result = await commandMongooseModel
      .find(filter)
      .skip(skip)
      .limit(currentLimit);
    const total = await commandMongooseModel.countDocuments(filter);
    const totalPages = Math.ceil(total / currentLimit);

    return {
      commands: result,
      totalPages,
    };
  };

  getById = async ({ id, userId }) => {
    return commandMongooseModel.findOne(buildFilter({ _id: id }, userId));
  };

  getByCommand = async ({ command, userId }) => {
    const result = await commandMongooseModel.findOne(
      buildFilter({ command }, userId),
    );
    return result ?? null;
  };

  createCommand = async ({ input, userId }) => {
    const commandExists = await commandMongooseModel.findOne(
      buildFilter({ command: input.command }, userId),
    );

    if (commandExists) {
      throw new ConflictError('A command with this trigger already exists for this user');
    }

    const command = new commandMongooseModel({ ...input, userId });
    return command.save();
  };

  updateCommand = async ({ id, input, userId }) => {
    const updated = await commandMongooseModel.findOneAndUpdate(
      buildFilter({ _id: id }, userId),
      input,
      { new: true },
    );

    if (!updated) {
      throw new NotFoundError('Command');
    }

    return updated;
  };

  delete = async ({ id, userId }) => {
    const deleted = await commandMongooseModel.findOneAndDelete(
      buildFilter({ _id: id }, userId),
    );

    if (!deleted) {
      throw new NotFoundError('Command');
    }

    return { message: 'Command deleted successfully' };
  };
}
