import mongoose from 'mongoose';
import { userSchema } from '../../schemas/mongo-schema/userSchema.js';

const userMongooseModel = mongoose.model('user', userSchema, 'users');

export class UserModel {
  create = async ({ input }) => {
    const user = new userMongooseModel(input);
    return user.save();
  };

  findOne = async ({ username, email } = {}) => {
    const conditions = [];
    if (username) conditions.push({ username });
    if (email) conditions.push({ email });
    if (conditions.length === 0) return null;
    return userMongooseModel.findOne({ $or: conditions });
  };

  findById = async (id) => {
    return userMongooseModel.findById(id);
  };

  findByEmail = async (email) => {
    return userMongooseModel.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');
  };

  findByResetToken = async (token) => {
    return userMongooseModel.findOne({ resetPasswordToken: token }).select('+resetPasswordToken +resetPasswordExpires');
  };

  updateResetFields = async (userId, { resetToken, resetExpires }) => {
    return userMongooseModel.findByIdAndUpdate(
      userId,
      {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
      { new: true }
    );
  };

  findByGoogleId = async (googleId) => {
    return userMongooseModel.findOne({ googleId });
  };

  linkGoogleId = async (userId, googleId) => {
    return userMongooseModel.findByIdAndUpdate(
      userId,
      { googleId },
      { new: true },
    );
  };

  updatePassword = async (userId, passwordHash) => {
    return userMongooseModel.findByIdAndUpdate(
      userId,
      {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
      { new: true }
    );
  };
}
