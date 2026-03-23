import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';

export const authRouter = ({ userModel }) => {
  const router = Router();
  const authController = new AuthController({ userModel });

  router.post('/register', authController.register);
  router.post('/login', authController.login);

  return router;
};
