export class CommandController{
    constructor({ commandModel}){
        this.commandModel = commandModel
    }

    getAll = async(req, res) => {
        const commands = await this.commandModel.getAll()

        res.json(commands)
    }
}