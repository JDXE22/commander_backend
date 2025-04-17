export class CommandController {
  constructor({ commandModel }) {
    this.commandModel = commandModel;
  }

  getAll = async (req, res) => {
      const commands = await this.commandModel.getAll();
      res.json(commands);

  };

  getByCommand = async (req, res) => {
      const command = decodeURIComponent(req.params.command);
      const commandData = await this.commandModel.getByCommand({ command });
      if (!commandData) {
        throw new Error(`No command was found`)
      }
      res.json(commandData);

  };

  getById = async (req, res) => {
      const { id } = req.params;
      const commandData = await this.commandModel.getById({ id });
      if (!commandData) {
        throw new Error(`No command was found`)
      }
      res.json(commandData);

  };

  saveCommand = async (req, res) => {
      const body = req.body;
      const commandData = await this.commandModel.createCommand({ input: body });
      if (!commandData) {
        throw new Error({message: `The entity could not be processed`})
      }
      res.json(commandData);

  };

  updateCommand = async (req, res) => {
      const { id } = req.params;

      const body = req.body;

      if (!id && !body) {
        throw new Error(`Neither the ID nor the body is being passed correctly`)
      }
  
      const commandUpdatedData = await this.commandModel.updateCommand({
        id,
        input: body,
      });
  
      return res.json(commandUpdatedData);

  };

  delete = async (req, res) => {
      const id = req.params;

      if (!id) {
        throw new Error(`ID is not being passed correctly`)
      }

      const deletedCommand = await this.commandModel.delete(id);
  
      if (deletedCommand === false) {
        return res.status(404).json({ message: "Command not found" });
      }
  
      return res.json(deletedCommand);


  };
}
