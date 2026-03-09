import { Router } from 'express';
import { CommandController } from '../controllers/commandsController.js';

export const commandRouter = ({ commandModel }) => {
  const router = Router();

  const commandController = new CommandController({ commandModel });

  /**
   * @openapi
   * /api/commands:
   *   get:
   *     summary: Get all commands
   *     description: Retrieve a list of all available commands. Can filter by trigger using ?trigger=.
   *     tags:
   *       - Commands
   *     parameters:
   *       - in: query
   *         name: trigger
   *         schema:
   *           type: string
   *         description: Filter commands by trigger string.
   *     responses:
   *       200:
   *         description: A list of commands.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: "#/components/schemas/Command"
   *       400:
   *         description: Bad request.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       500:
   *         description: Internal server error.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  router.get('/', commandController.getAll);

  /**
   * @openapi
   * /api/commands/{id}:
   *   get:
   *     summary: Get command by ID
   *     description: Retrieve a single command using its unique identifier.
   *     tags:
   *       - Commands
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique identifier of the command.
   *     responses:
   *       200:
   *         description: Command found.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/Command"
   *       400:
   *         description: Bad request.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       404:
   *         description: Command not found.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       500:
   *         description: Internal server error.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  router.get('/:id', commandController.getById);

  /**
   * @openapi
   * /api/commands:
   *   post:
   *     summary: Create a new command
   *     description: Create a new command that maps a trigger to a text response.
   *     tags:
   *       - Commands
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/CommandCreateInput"
   *     responses:
   *       201:
   *         description: Command created successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/Command"
   *       400:
   *         description: Bad request.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       409:
   *         description: Command already exists.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       500:
   *         description: Internal server error.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  router.post('/', commandController.create);

  /**
   * @openapi
   * /api/commands/{id}:
   *   patch:
   *     summary: Update an existing command
   *     description: Update one or more fields of an existing command.
   *     tags:
   *       - Commands
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique identifier of the command to update.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: "#/components/schemas/CommandUpdateInput"
   *     responses:
   *       200:
   *         description: Command updated successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/Command"
   *       400:
   *         description: Bad request.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       404:
   *         description: Command not found.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       500:
   *         description: Internal server error.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  router.patch('/:id', commandController.update);

  /**
   * @openapi
   * /api/commands/{id}:
   *   delete:
   *     summary: Delete a command
   *     description: Delete an existing command by its unique identifier.
   *     tags:
   *       - Commands
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique identifier of the command to delete.
   *     responses:
   *       200:
   *         description: Command deleted successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/DeleteResponse"
   *       400:
   *         description: Bad request.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       404:
   *         description: Command not found.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   *       500:
   *         description: Internal server error.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: "#/components/schemas/ErrorResponse"
   */
  router.delete('/:id', commandController.delete);

  return router;
};
