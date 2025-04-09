import commands from "../config/commands.json" with {type:"json" }

export class CommandModel {
  constructor() {
    this.commands = commands;
  }
  getAll = () => {
    return commands;
  };

   getById = ({id}) => {
    if (id) {
        const commandById = commands.find((cmd) => cmd.id === id)
        return commandById
    }
  }

   getByCommand = ({ command }) => {
    if (command) {
      const commandByName = commands.filter(
        (cmd) => cmd.command.toLowerCase() === command.toLowerCase()
      );
      return commandByName;
    }
    return [];
  };
}
