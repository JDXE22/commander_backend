import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors.js';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

function validateRegisterInput({ username, email, password }) {
  if (!username || !email || !password) {
    throw new BadRequestError('Username, email, and password are required');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
}

function validateLoginInput({ username, password }) {
  if (!username || !password) {
    throw new BadRequestError('Username and password are required');
  }
}

function formatAuthResponse(user, token) {
  return {
    userId: user._id,
    username: user.username,
    email: user.email,
    token,
  };
}

export class AuthController {
  constructor({ userModel }) {
    this.userModel = userModel;
  }

  #createToken(userId, username) {
    return jwt.sign(
      { userId, username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );
  }

  register = async (req, res, next) => {
    try {
      validateRegisterInput(req.body);

      const { username, email, password } = req.body;

      const existingUser = await this.userModel.findOne({ username, email });
      if (existingUser) {
        throw new ConflictError('User already exists');
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await this.userModel.create({
        input: { username, email, passwordHash },
      });

      const token = this.#createToken(user._id, user.username);
      res.status(201).json(formatAuthResponse(user, token));
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      validateLoginInput(req.body);

      const { username, password } = req.body;

      const user = await this.userModel.findOne({ username });
      if (!user) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const token = this.#createToken(user._id, user.username);
      res.json(formatAuthResponse(user, token));
    } catch (error) {
      next(error);
    }
  };
}
