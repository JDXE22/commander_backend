import mongoose from "mongoose";

export const commandSchema = new mongoose.Schema({
    name: { type: String, required: true},
    command: { type: String, required: true},
    text: {type: String, required: true}

})