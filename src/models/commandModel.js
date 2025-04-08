import commands from "../config/commands.json" with {type:"json" }
export class CommandModel {
    static getAll(){
        return commands
    }
}