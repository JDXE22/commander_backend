import commands from "../config/commands.json" with {type:"json" }
export class CommandModel {
  constructor() {
    this.commands = commands;
  }
  getAll = () => {
    return commands;
  };

  getByName = ({ name }) => {
    if (name) {
      const commandByName = commands.filter(
        (cmd) => cmd.name.toLowerCase() === name.toLowerCase()
      );
      return commandByName;
    }
    return [];
  };

  getById = ({id}) => {
    const commandById = commands.findIndex((cmd) => cmd.id === id)
    return commandById
  }
}
