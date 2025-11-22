const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Expense Tracker API',
      version: '1.0.0',
      description: 'API documentation for Expense Tracker Backend',
      contact: {
        name: 'API Support',
        email: 'support@expensetracker.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'username', 'email', 'password'],
          properties: {
            name: {
              type: 'string',
              description: 'User full name'
            },
            username: {
              type: 'string',
              description: 'Unique username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'manager'],
              default: 'user',
              description: 'User role'
            }
          }
        },
        Team: {
          type: 'object',
          required: ['name', 'ownerUsername'],
          properties: {
            name: {
              type: 'string',
              description: 'Team name'
            },
            ownerUsername: {
              type: 'string',
              description: 'Username of the team owner'
            },
            memberUsernames: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of member usernames'
            }
          }
        },
        Category: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              description: 'Category name'
            },
            description: {
              type: 'string',
              description: 'Category description'
            }
          }
        },
        Expense: {
          type: 'object',
          required: ['title', 'amount', 'category'],
          properties: {
            title: {
              type: 'string',
              description: 'Expense title'
            },
            amount: {
              type: 'number',
              description: 'Expense amount'
            },
            category: {
              type: 'string',
              description: 'Category ID'
            },
            description: {
              type: 'string',
              description: 'Expense description'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Expense date'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Error details'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./app/routes/*.js'] // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

