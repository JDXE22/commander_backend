export class CommandController{
    constructor({ commandModel}){
        this.commandModel = commandModel
    }

    getAll = (req, res) => {        
        const commands = this.commandModel.getAll()

        res.json(commands)
    }
}