import { Router } from 'express';
import { CommandController } from '../controllers/commandsController.js';

export const commandRouter = ({ commandModel }) => {
  const router = Router();

  const commandController = new CommandController({ commandModel });

  /**
   * @openapi
   * /api/commands:
   *   get:
   *     summary: Get all commands or search by trigger
   *     description: |
   *       Without query parameters, returns a paginated list of all commands.
   *       When `trigger` is provided, returns the single command matching that trigger string.
   *     tags:
   *       - Commands
   *     parameters:
   *       - in: query
   *         name: trigger
   *         schema:
   *           type: string
   *         description: Trigger string to search for (e.g. `/hi1`). URL-encode special characters.
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: Page number for pagination (default 1).
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Number of results per page (default 5).
   *     responses:
   *       200:
   *         description: A paginated list of commands, or a single matching command when trigger is provided.
   *         content:
   *           application/json:
   *             schema:
   *               oneOf:
   *                 - type: object
   *                   properties:
   *                     commands:
   *                       type: array
   *                       items:
   *                         $ref: "#/components/schemas/Command"
   *                     totalPages:
   *                       type: integer
   *                 - $ref: "#/components/schemas/Command"
   *       404:
   *         description: Command not found (only when trigger is used).
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
  const byTrigger = (req, res, next) => {
    if (req.query.trigger)
      return commandController.getByCommand(req, res, next);
    next();
  };
  router.get('/', byTrigger, commandController.getAll);

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
