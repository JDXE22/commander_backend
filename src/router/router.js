import { Router } from "express"
import { CommandController } from "../controllers/commandsController.js";

export const commandRouter = ({commandModel})=> {
    const router = Router();

    const commandController = new CommandController({commandModel})
    
    router.get("/:command", commandController.getByCommand)

    router.get("/:id", commandController.getById)

    router.post("/", commandController.saveCommand)

    router.patch("/:id", commandController.updateCommand)

    router.delete("/:id", commandController.delete)

    return router;
}