import { Router } from "express"

export const commandRouter = ()=> {
    const router = Router();

    router.get("/command", (req, res)=> {
      res.status(200).send("Command endpoint")
        
    })


    return router;
}