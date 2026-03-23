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
}
