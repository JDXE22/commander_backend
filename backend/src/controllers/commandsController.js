import { NotFoundError, BadRequestError } from '../utils/errors.js';

export class CommandController {
  constructor({ commandModel }) {
    this.commandModel = commandModel;
  }

  getAll = async (req, res, next) => {
    try {
      const commands = await this.commandModel.getAll({
        userId: req.user?.userId,
        query: req.query,
      });
      res.json(commands);
    } catch (error) {
      next(error);
    }
  };

  getByCommand = async (req, res, next) => {
    try {
      let command;
      try {
        command = decodeURIComponent(req.query.trigger);
      } catch (error) {
        if (error instanceof URIError) {
          throw new BadRequestError('Invalid percent-encoding in query');
        }
        throw error;
      }

      const result = await this.commandModel.getByCommand({
        command,
        userId: req.user?.userId,
      });

      if (!result) return next(new NotFoundError('Command'));

      return res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const command = await this.commandModel.getById({
        id,
        userId: req.user?.userId,
      });

      if (!command) return next(new NotFoundError('Command'));
      res.json(command);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const command = await this.commandModel.createCommand({
        input: req.body,
        userId: req.user?.userId,
      });
      res.status(201).json(command);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { body } = req;

      if (Object.keys(body).length === 0)
        return next(new BadRequestError('Request body is empty'));

      const {
        userId: _u,
        _id: _i,
        createdAt: _c,
        updatedAt: _d,
        ...safeInput
      } = body;

      if (Object.keys(safeInput).length === 0)
        return next(new BadRequestError('No updatable fields provided'));

      const updatedCommand = await this.commandModel.updateCommand({
        id,
        input: safeInput,
        userId: req.user?.userId,
      });
      return res.json(updatedCommand);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await this.commandModel.delete({
        id,
        userId: req.user?.userId,
      });
      return res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
