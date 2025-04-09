import { Router } from "express"
import { CommandController } from "../controllers/commandsController.js";

export const commandRouter = ({commandModel})=> {
    const router = Router();

    const commandController = new CommandController({commandModel})

    router.get("/", commandController.getAll)

    router.get("/:command", commandController.getByCommand)


    return router;
}