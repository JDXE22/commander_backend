import { Router } from "express"
import { CommandController } from "../controllers/commandsController.js";

export const commandRouter = ({commandModel})=> {
    const router = Router();

    const commandController = new CommandController({commandModel})

    router.get("/cmd/", commandController.getAll)    

    router.get("/cmd/:command", commandController.getByCommand)
    
    router.get("/cmd/:id", commandController.getById)

    router.post("/", commandController.saveCommand)

    router.patch("/cmd/:id", commandController.updateCommand)

    router.delete("/cmd/:id", commandController.delete)

    return router;
}