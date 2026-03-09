
export class CommandController {
  constructor({ commandModel }) {
    this.commandModel = commandModel;
  }

  getAll = async (req, res, next) => {
    try {
      const { trigger } = req.query;
      let commands;
      if (trigger) {
        commands = await this.commandModel.getByCommand({
          command: decodeURIComponent(trigger),
        });
      } else {
        commands = await this.commandModel.getAll({ query: req.query });
      }
      res.json(commands);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const commandData = await this.commandModel.getById({ id });

      if (!commandData) {
        return res.status(404).json({ message: "Command not found" });
      }
      res.json(commandData);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const body = req.body;
      const commandData = await this.commandModel.createCommand({ input: body });
      if (!commandData) {
        return res.status(422).json({ message: "The entity could not be processed" });
      }
      res.status(201).json(commandData);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = req.body;

      if (!id || Object.keys(body).length === 0) {
        return res.status(400).json({ message: "ID or body is missing" });
      }

      const commandUpdatedData = await this.commandModel.updateCommand({
        id,
        input: body,
      });

      if (!commandUpdatedData) {
        return res.status(404).json({ message: "Command not found" });
      }

      return res.json(commandUpdatedData);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "ID is required" });
      }

      const deletedCommand = await this.commandModel.delete({ id });

      if (deletedCommand === false) {
        return res.status(404).json({ message: "Command not found" });
      }

      return res.json({ message: "Command deleted successfully" });
    } catch (error) {
      next(error);
    }
  };
}
