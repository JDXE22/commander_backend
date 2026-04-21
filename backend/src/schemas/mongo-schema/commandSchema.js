import mongoose from 'mongoose';

export const commandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    command: { type: String, required: true },
    text: { type: String, required: true },
    commandLower: { type: String, required: false },
    textLower: { type: String, required: false },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
  },
  { timestamps: true },
);
