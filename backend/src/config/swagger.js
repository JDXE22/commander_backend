import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Commander API',
    version: '2.0.0',
    description:
      'API for managing command-driven snippets with user authentication and data isolation.',
  },
  servers: [
    {
      url: '/',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token generated via /api/v2/auth/login',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          tier: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
          isActive: { type: 'boolean' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          token: { type: 'string' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', example: 'newuser' },
          email: { type: 'string', example: 'user@example.com' },
          password: {
            type: 'string',
            example: 'SecretPass123!',
            format: 'password',
          },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'newuser' },
          password: {
            type: 'string',
            example: 'SecretPass123!',
            format: 'password',
          },
        },
      },
      Command: {
        type: 'object',
        required: ['name', 'command', 'text'],
        properties: {
          _id: {
            type: 'string',
            description: 'Unique identifier of the command',
          },
          name: { type: 'string', example: 'Greeting' },
          command: { type: 'string', example: '/hi1' },
          text: { type: 'string', example: 'Hello, welcome to our service!' },
          userId: { type: 'string', description: 'ID of the owner user' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CommandCreateInput: {
        type: 'object',
        required: ['name', 'command', 'text'],
        properties: {
          name: { type: 'string', example: 'Greeting' },
          command: { type: 'string', example: '/hi1' },
          text: { type: 'string', example: 'Hello, welcome to our service!' },
        },
      },
      CommandUpdateInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          command: { type: 'string' },
          text: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'resource not found' },
          message: { type: 'string' },
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
  // Scan for all JSDoc comments in the src directory and its subdirectories
  apis: ['./src/**/*.js'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
