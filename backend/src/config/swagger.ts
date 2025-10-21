import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ChessSlack API',
      version: '1.0.0',
      description: 'API documentation for ChessSlack - an all-in-one workspace collaboration platform',
      contact: {
        name: 'ChessSlack Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://chess-slack-production.up.railway.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer {token}',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            username: {
              type: 'string',
            },
            display_name: {
              type: 'string',
            },
            avatar_url: {
              type: 'string',
              nullable: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Workspace: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Channel: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            workspace_id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            is_private: {
              type: 'boolean',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            channel_id: {
              type: 'string',
              format: 'uuid',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
            },
            content: {
              type: 'string',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
