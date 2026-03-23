import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthController {
  constructor({ userModel }) {
    this.userModel = userModel;
  }

  register = async (req, res, next) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      const existingUser = await this.userModel.findOne({ username, email });
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userSource = await this.userModel.create({
        input: {
          username,
          email,
          passwordHash
        }
      });

      const token = jwt.sign(
        { userId: userSource._id, username: userSource.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
      );

      res.status(201).json({
        userId: userSource._id,
        username: userSource.username,
        email: userSource.email,
        token
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const userSource = await this.userModel.findOne({ username });
      if (!userSource) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const isValid = await bcrypt.compare(password, userSource.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { userId: userSource._id, username: userSource.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
      );

      res.json({
        userId: userSource._id,
        username: userSource.username,
        email: userSource.email,
        token
      });
    } catch (error) {
      next(error);
    }
  };
}
