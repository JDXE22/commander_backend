import commands from "../config/commands.json" with {type:"json" }
export class CommandModel {
    constructor(){
        this.commands= commands
    }
    static getAll(){
        return this.commands


    }
}