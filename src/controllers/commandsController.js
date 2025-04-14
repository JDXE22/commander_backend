export class CommandController {
  constructor({ commandModel }) {
    this.commandModel = commandModel;
  }

  getAll = async (req, res) => {
    const commands = await this.commandModel.getAll();

    res.json(commands);
  };

  getByCommand = (req, res) => {
    const command = decodeURIComponent(req.params.command);
    const commandData = this.commandModel.getByCommand({ command });
    res.json(commandData);
  };

  getById = (req, res) => {
    const { id } = req.params;
    const commandData = this.commandModel.getById({ id });
    res.json(commandData);
  };

  saveCommand = (req, res) => {
    const { body } = req;
    const commandData = this.commandModel.createCommand({ input: body });
    res.json(commandData);
  };

  updateCommand = (req, res) => {
    const { id } = req.params;

    const { body } = req.body;

    const commandUpdatedData = this.commandModel.updateCommand({
      id,
      input: body,
    });

    return res.json(commandUpdatedData);
  };
}
