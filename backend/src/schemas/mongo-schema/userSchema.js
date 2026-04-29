import mongoose from 'mongoose';

export const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 50,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /.+\@.+\..+/,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tier: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true },
);
