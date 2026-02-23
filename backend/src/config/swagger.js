import swaggerJsdoc from 'swagger-jsdoc';
import { PORT } from './config.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Commander API',
    version: '1.0.0',
    description:
      'API for managing command-driven snippets. Generated from JSDoc comments.',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
    },
  ],
  components: {
    schemas: {
      Command: {
        type: 'object',
        required: ['name', 'command', 'text'],
        properties: {
          _id: {
            type: 'string',
            description: 'Unique identifier of the command',
            example: '681e68820ce3d72ad1ab36ed',
          },
          name: {
            type: 'string',
            description: 'Human-readable name of the command',
            example: 'Greeting',
          },
          command: {
            type: 'string',
            description: 'Command trigger that starts with a slash',
            example: '/hi1',
          },
          text: {
            type: 'string',
            description: 'Text response returned when the command is used',
            example: 'Hello, welcome to our service!',
          },
        },
      },
      CommandCreateInput: {
        type: 'object',
        required: ['name', 'command', 'text'],
        properties: {
          name: {
            type: 'string',
            example: 'Greeting',
          },
          command: {
            type: 'string',
            example: '/hi1',
          },
          text: {
            type: 'string',
            example: 'Hello, welcome to our service!',
          },
        },
      },
      CommandUpdateInput: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            example: 'Updated greeting',
          },
          command: {
            type: 'string',
            example: '/hi2',
          },
          text: {
            type: 'string',
            example: 'Hi there, good to see you again!',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            example: 'resource not found',
          },
          message: {
            type: 'string',
            example: 'Validation failed',
          },
        },
      },
      DeleteResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Command has been deleted successfully',
          },
        },
      },
    },
  },
};

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/router/router.js'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
