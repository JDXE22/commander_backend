import mongoose from 'mongoose';
import { userSchema } from '../../schemas/mongo-schema/userSchema.js';

const userMongooseModel = mongoose.model('user', userSchema, 'users');

export class UserModel {
  create = async ({ input }) => {
    const user = new userMongooseModel(input);
    return user.save();
  };

  findOne = async ({ username, email }) => {
    const query = {};
    if (username) query.username = username;
    if (email) query.email = email;
    return userMongooseModel.findOne(query);
  };

  findById = async (id) => {
    return userMongooseModel.findById(id);
  };
}
