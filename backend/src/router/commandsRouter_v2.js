import { Router } from 'express';
import { CommandController } from '../controllers/commandsController.js';

export const commandRouter_v2 = ({ commandModel }) => {
  const router = Router();
  const commandController = new CommandController({ commandModel });

  // All v2 routes are protected (middleware applied in app.js)
  router.get('/', commandController.getAll);
  router.get('/:id', commandController.getById);
  router.post('/', commandController.create);
  router.patch('/:id', commandController.update);
  router.delete('/:id', commandController.delete);

  return router;
};
