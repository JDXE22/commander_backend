import { NotFoundError, BadRequestError } from '../utils/errors.js';

export class CommandController {
  constructor({ commandModel }) {
    this.commandModel = commandModel;
  }

  getAll = async (req, res, next) => {
    try {
      const commands = await this.commandModel.getAll({ query: req.query });
      res.json(commands);
    } catch (error) {
      next(error);
    }
  };

  getByCommand = async (req, res, next) => {
    try {
      const command = decodeURIComponent(req.query.trigger);
      const result = await this.commandModel.getByCommand({ command });

      if (!result) return next(new NotFoundError('Command'));

      return res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const commandData = await this.commandModel.getById({ id });

      if (!commandData) return next(new NotFoundError('Command'));
      res.json(commandData);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const commandData = await this.commandModel.createCommand({
        input: req.body,
      });
      res.status(201).json(commandData);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = req.body;

      if (Object.keys(body).length === 0)
        return next(new BadRequestError('Request body is empty'));

      const updatedData = await this.commandModel.updateCommand({
        id,
        input: body,
      });
      return res.json(updatedData);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await this.commandModel.delete({ id });
      return res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
