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
    res.json(commandData);
  };

  getById = async (req, res) => {
    const { id } = req.params;
    const commandData = await this.commandModel.getById({ id });
    res.json(commandData);
  };

  saveCommand = async (req, res) => {
    const { body } = req.body;
    const commandData = await this.commandModel.createCommand({ input: body });
    res.json(commandData);
  };

  updateCommand = async (req, res) => {
    const { id } = req.params;

    const { body } = req.body;

    const commandUpdatedData = await this.commandModel.updateCommand({
      id,
      input: body,
    });

    return res.json(commandUpdatedData);
  };
}
