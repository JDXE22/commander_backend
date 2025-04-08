import express, { json } from "express";
import 'dotenv/config'
import { commandRouter } from "./router/router.js";


const app = express();

const PORT = process.env.PORT || 1234;

app.use(express.json())

app.use(json())

app.use("/command", commandRouter())

app.listen(PORT, ()=> {
    console.log(`Server is running on port ${PORT}`);
})

