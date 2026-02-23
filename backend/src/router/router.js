import { Router } from 'express';
import { CommandController } from '../controllers/commandsController.js';

export const commandRouter = ({ commandModel }) => {
  const router = Router();

  const commandController = new CommandController({ commandModel });

  /**
   * @openapi
   * /command/cmd:
   *   get:
   *     summary: Get all commands
   *     description: Retrieve a paginated list of all available commands.
   *     tags:
   *       - Commands
   *     responses:
   *       200:
   *         description: A paginated list of commands.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 commands:
   *                   type: array
   *                   items:
   *                     $ref: "#/components/schemas/Command"
   *                 totalPages:
   *                   type: integer
   *                   example: 3
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
  router.get('/cmd/', commandController.getAll);

  /**
   * @openapi
   * /command/cmd/{command}:
   *   get:
   *     summary: Get command by trigger
   *     description: Retrieve a single command by its trigger string (e.g. `/hi1`).
   *     tags:
   *       - Commands
   *     parameters:
   *       - in: path
   *         name: command
   *         required: true
   *         schema:
   *           type: string
   *         description: Encoded command trigger. Use URL encoding for `/`.
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
  router.get('/cmd/:command', commandController.getByCommand);

  /**
   * @openapi
   * /command/cmd/{id}:
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
  router.get('/cmd/:id', commandController.getById);

  /**
   * @openapi
   * /command/cmd:
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
  router.post('/cmd/', commandController.saveCommand);

  /**
   * @openapi
   * /command/cmd/{id}:
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
  router.patch('/cmd/:id', commandController.updateCommand);

  /**
   * @openapi
   * /command/cmd/{id}:
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
  router.delete('/cmd/:id', commandController.delete);

  return router;
};
