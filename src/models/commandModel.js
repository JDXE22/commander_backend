import commands from "../config/commands.json" with {type:"json" }
export class CommandModel {
    constructor(){
        this.commands= Array.isArray(commands) ? commands[0] : commands
    }
     getAll = () => {
        return commands
    }
}