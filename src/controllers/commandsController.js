export class CommandController {
  constructor({ commandModel }) {
    this.commandModel = commandModel;
  }

  getAll = async (req, res) => {
    try {
      const commands = await this.commandModel.getAll();

      res.json(commands);
    } catch (error) {
      if (error) {
        return res.status(404).json({ message: `No commands were found` });
      }
    }
  };

  getByCommand = async (req, res) => {
    try {
      const command = decodeURIComponent(req.params.command);
      const commandData = await this.commandModel.getByCommand({ command });
      res.json(commandData);
    } catch (error) {
      if (error) {
        return res.status(404).json({ message: `No command was found` });
      }
    }
  };

  getById = async (req, res) => {
    try {
      const { id } = req.params;
      const commandData = await this.commandModel.getById({ id });
      res.json(commandData);
    } catch (error) {
      if (error) {
        return res.status(404).json({ message: `No command was found using this ID` });
      }
    }
  };

  saveCommand = async (req, res) => {
    try {
      const body = req.body;
      const commandData = await this.commandModel.createCommand({ input: body });
      res.json(commandData);
    } catch (error) {
      if (error) {
        return res.status(422).json({message: `Your command could not be created, please try again`})
      }
    }
  };

  updateCommand = async (req, res) => {
    try {
      const { id } = req.params;

      const body = req.body;
  
      const commandUpdatedData = await this.commandModel.updateCommand({
        id,
        input: body,
      });
  
      return res.json(commandUpdatedData);
    } catch (error) {
      if (error) {
        return res.status(422).json({message: `Your command could not be updated, please try again`})
      }
    }
  };

  delete = async (req, res) => {
    try {
      const id = req.params;

      const deletedCommand = await this.commandModel.delete(id);
  
      if (deletedCommand === false) {
        return res.status(404).json({ message: "Command not found" });
      }
  
      return res.json(deletedCommand);
    } catch (error) {
      if (error) {
        return res.status(404).json({message: `The command could not be deleted, please try again`})
      }
    }

  };
}
