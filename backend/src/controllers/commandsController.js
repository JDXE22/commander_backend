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
      let decodedCommand;
      try {
        decodedCommand = decodeURIComponent(req.query.trigger);
      } catch (encodingError) {
        if (encodingError instanceof URIError) {
          throw new BadRequestError('Invalid percent-encoding in query');
        }
        throw encodingError;
      }

      const commandResult = await this.commandModel.getByCommand({
        command: decodedCommand,
        userId: req.user?.userId,
      });

      if (!commandResult) return next(new NotFoundError('Command'));

      return res.json(commandResult);
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
      const { body: requestBody } = req;

      if (Object.keys(requestBody).length === 0)
        return next(new BadRequestError('Request body is empty'));

      const {
        userId: _userId,
        _id: _documentId,
        createdAt: _createdDate,
        updatedAt: _updatedDate,
        ...safeInputFields
      } = requestBody;

      if (Object.keys(safeInputFields).length === 0)
        return next(new BadRequestError('No updatable fields provided'));

      const updatedCommand = await this.commandModel.updateCommand({
        id,
        input: safeInputFields,
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

  search = async (req, res, next) => {
    try {
      const {
        query: searchQuery,
        q: legacySearchQuery,
        limit: resultLimit,
      } = req.query;
      const resolvedSearchQuery = searchQuery ?? legacySearchQuery;

      if (!resolvedSearchQuery) {
        return next(
          new BadRequestError(
            "Query parameter 'query' is required and must be a non-empty string",
          ),
        );
      }

      const searchResults = await this.commandModel.searchTemplates({
        userId: req.user?.userId,
        query: resolvedSearchQuery,
        limit: resultLimit,
      });

      res.set('Cache-Control', 'private, no-cache, max-age=0, must-revalidate');
      res.set('Vary', 'Authorization');

      return res.json(searchResults);
    } catch (error) {
      next(error);
    }
  };
}
