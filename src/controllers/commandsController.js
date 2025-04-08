export class CommandController{
    constructor({ commandModel}){
        this.commandModel = commandModel
    }

    getAll = (req, res) => {
        const {command} = req.query;
        
        const commands = this.commandModel.getAll({command})

        res.json(commands)
    }
}