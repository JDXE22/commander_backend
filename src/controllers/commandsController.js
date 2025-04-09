export class CommandController{
    constructor({ commandModel}){
        this.commandModel = commandModel
    }

    getAll = (req, res) => {        
        const commands = this.commandModel.getAll()

        res.json(commands)
    }

    getByCommand = (req, res) => {
        const command = decodeURIComponent(req.params.command)
        const commandData = this.commandModel.getByCommand({command})
        res.json(commandData)
    }

    getById = (req, res) => {
        const {id} = req.params
        const commandData = this.commandModel.getById({id})
        res.json(commandData)
    }
}