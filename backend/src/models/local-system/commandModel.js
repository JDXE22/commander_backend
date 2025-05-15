import commands from "../../config/commands.json" with {type:"json" }

export class CommandModel {
  constructor() {
    this.commands = commands;
  }
  getAll = () => {
    return commands;
  };

  getById = ({ id }) => {
    if (id) {
      const commandById = commands.find((cmd) => cmd.id === id);
      return commandById;
    }
  };

  getByCommand = ({ command }) => {
    if (command) {
      const commandByName = commands.filter(
        (cmd) => cmd.command.toLowerCase() === command.toLowerCase()
      );
      return commandByName;
    }
  };

  createCommand = ({ input }) => {
    const newCommand = {
      id: commands.length + 1,
      ...input,
    };

    commands.push(newCommand);

    return newCommand;
  };

  updateCommand = ({ id, input }) => {
    const commandIndex = commands.findIndex((cmd) => cmd.id === id);
    if (commandIndex !== -1) {
      commands[commandIndex] = {
        ...commands[commandIndex],
        ...input,
      };
      return commands[commandIndex];
    }
  };

  delete = ({ id }) => {
      const commandById = commands.findIndex((cmd) => cmd.id === id);    
      if (commandById === -1) return false; 
    commands.splice(commandById, 1)

    return {message: `Command has been deleted successfully`}
  };
}
