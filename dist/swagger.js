const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Expense Tracker API",
      version: "1.0.0",
      description:
        "Complete API documentation for Expense Tracker Backend. This API provides endpoints for user management, team management, expense tracking, category management, reports, and budget overview.",
      contact: {
        name: "API Support",
        email: "support@expensetracker.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://api.expensetracker.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter your JWT token. Get your token by logging in or completing MFA setup.",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["name", "username", "email", "password"],
          properties: {
            _id: {
              type: "string",
              description: "User unique identifier",
              example: "673abc123def456789012345",
            },
            name: {
              type: "string",
              description: "User full name",
              example: "John Doe",
            },
            username: {
              type: "string",
              description: "Unique username",
              example: "johndoe",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "john@example.com",
            },
            password: {
              type: "string",
              format: "password",
              description: "User password (min 8 characters)",
              example: "SecurePassword123!",
            },
            role: {
              type: "string",
              enum: ["MANAGER", "MEMBER"],
              default: "MEMBER",
              description: "User role in the system",
            },
            user_type: {
              type: "string",
              enum: ["ADMIN", "USER"],
              description: "User type",
            },
            member_type: {
              type: "string",
              enum: ["MANAGER", "MEMBER"],
              default: "MEMBER",
              description: "Member type",
            },
            status: {
              type: "string",
              enum: ["active", "inactive", "pending"],
              description: "User account status",
            },
            mfa_enabled: {
              type: "boolean",
              default: false,
              description: "Whether MFA is enabled",
            },
            mfa_method: {
              type: "string",
              enum: ["TOTP", "PASSKEY"],
              description: "MFA method used",
            },
            invitation: {
              type: "string",
              enum: ["pending", "accepted", "rejected"],
              description: "Invitation status",
            },
            phone_number: {
              type: "string",
              description: "User phone number",
            },
            is_phone_number_verified: {
              type: "boolean",
              default: false,
              description: "Whether phone number is verified",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update date",
            },
          },
        },
        Team: {
          type: "object",
          required: ["name", "team_leader"],
          properties: {
            _id: {
              type: "string",
              description: "Team unique identifier",
              example: "673abc123def456789012345",
            },
            name: {
              type: "string",
              description: "Team name",
              example: "Development Team",
            },
            description: {
              type: "string",
              description: "Team description",
              example: "Main development team",
            },
            team_leader: {
              type: "string",
              description: "User ID of the team leader",
              example: "673abc123def456789012345",
            },
            members: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Array of member user IDs",
              example: ["673abc123def456789012345", "673abc123def456789012346"],
            },
            monthly_budget: {
              type: "number",
              description: "Monthly budget allocated to the team",
              example: 10000,
            },
            monthly_budget_remaining: {
              type: "number",
              description: "Remaining monthly budget",
              example: 5000,
            },
          },
        },
        Category: {
          type: "object",
          required: ["name", "description", "color"],
          properties: {
            _id: {
              type: "string",
              description: "Category unique identifier",
              example: "673abc123def456789012345",
            },
            name: {
              type: "string",
              description: "Category name",
              example: "Office Supplies",
            },
            description: {
              type: "string",
              description: "Category description",
              example: "Expenses related to office supplies and equipment",
            },
            color: {
              type: "string",
              description: "Category color (hex code)",
              example: "#FF5733",
            },
          },
        },
        Expense: {
          type: "object",
          required: [
            "title",
            "amount",
            "category",
            "description",
            "date",
            "createdBy",
          ],
          properties: {
            _id: {
              type: "string",
              description: "Expense unique identifier",
              example: "673abc123def456789012345",
            },
            title: {
              type: "string",
              description: "Expense title",
              example: "Office Supplies Purchase",
            },
            amount: {
              type: "number",
              description: "Expense amount",
              example: 150.5,
            },
            category: {
              type: "string",
              description: "Category ID",
              example: "673abc123def456789012345",
            },
            description: {
              type: "string",
              description: "Expense description",
              example: "Purchased notebooks, pens, and stationery",
            },
            date: {
              type: "string",
              format: "date",
              description: "Expense date",
              example: "2024-01-15",
            },
            team: {
              type: "string",
              description: "Team ID (optional)",
              example: "673abc123def456789012345",
            },
            createdBy: {
              type: "string",
              description: "User ID who created the expense",
              example: "673abc123def456789012345",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Expense creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update date",
            },
          },
        },
        Report: {
          type: "object",
          required: [
            "team",
            "category",
            "totalAmount",
            "periodStart",
            "periodEnd",
            "date",
          ],
          properties: {
            _id: {
              type: "string",
              description: "Report unique identifier",
              example: "673abc123def456789012345",
            },
            team: {
              type: "string",
              description: "Team ID",
              example: "673abc123def456789012345",
            },
            category: {
              type: "string",
              description: "Category ID",
              example: "673abc123def456789012345",
            },
            totalAmount: {
              type: "number",
              description: "Total amount for the period",
              example: 5000,
            },
            periodStart: {
              type: "string",
              format: "date",
              description: "Report period start date",
              example: "2024-01-01",
            },
            periodEnd: {
              type: "string",
              format: "date",
              description: "Report period end date",
              example: "2024-01-31",
            },
            date: {
              type: "string",
              format: "date",
              description: "Report date",
              example: "2024-01-31",
            },
            status: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
              default: "pending",
              description: "Report status",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Report creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update date",
            },
          },
        },
        Budget: {
          type: "object",
          required: ["totalBudget"],
          properties: {
            _id: {
              type: "string",
              description: "Budget record unique identifier",
              example: "673abc123def456789012345",
            },
            totalSpent: {
              type: "number",
              description: "Total amount spent",
              example: 5000,
            },
            budgetLeft: {
              type: "number",
              description: "Remaining budget",
              example: 5000,
            },
            totalBudget: {
              type: "number",
              description: "Total budget allocated",
              example: 10000,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Budget record creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update date",
            },
          },
        },
        Overview: {
          type: "object",
          properties: {
            totalSpent: {
              type: "number",
              description: "Total amount spent across all expenses",
              example: 5000,
            },
            totalBudget: {
              type: "number",
              description: "Total budget allocated",
              example: 10000,
            },
            budgetLeft: {
              type: "number",
              description: "Remaining budget",
              example: 5000,
            },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Login successful",
            },
            token: {
              type: "string",
              description: "JWT token for authentication",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            user: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
                email: {
                  type: "string",
                },
                name: {
                  type: "string",
                },
                username: {
                  type: "string",
                },
                role: {
                  type: "string",
                },
              },
            },
          },
        },
        MfaChallengeResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Password is correct. Please verify MFA.",
            },
            mfa_method: {
              type: "string",
              enum: ["TOTP", "PASSKEY"],
              example: "TOTP",
            },
            challengeId: {
              type: "string",
              description: "Challenge ID for MFA verification",
              example: "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a",
            },
          },
        },
        PasskeyCredential: {
          type: "object",
          required: ["id", "rawId", "response", "type"],
          properties: {
            id: {
              type: "string",
              description: "Base64url encoded credential ID",
              example: "AQEBAgMFCA0VIjdZEGl5Yls",
            },
            rawId: {
              type: "string",
              description: "Base64url encoded raw credential ID",
              example: "AQEBAgMFCA0VIjdZEGl5Yls",
            },
            response: {
              type: "object",
              required: ["clientDataJSON", "attestationObject"],
              properties: {
                clientDataJSON: {
                  type: "string",
                  description: "Base64url encoded client data JSON",
                },
                attestationObject: {
                  type: "string",
                  description: "Base64url encoded attestation object",
                },
                transports: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["usb", "nfc", "ble", "internal", "hybrid"],
                  },
                },
              },
            },
            type: {
              type: "string",
              enum: ["public-key"],
              example: "public-key",
            },
            clientExtensionResults: {
              type: "object",
              description: "Client extension results",
            },
            authenticatorAttachment: {
              type: "string",
              enum: ["platform", "cross-platform"],
              description: "Type of authenticator used",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message",
              example: "An error occurred",
            },
            error: {
              type: "string",
              description: "Detailed error information",
              example: "Detailed error message",
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Success message",
              example: "Operation completed successfully",
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Authentication required or invalid token",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                message: "Unauthorized. Please provide a valid token.",
              },
            },
          },
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                message: "Resource not found",
              },
            },
          },
        },
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                message: "Validation failed",
                error: "Missing required fields",
              },
            },
          },
        },
        ServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                message: "Internal server error",
                error: "An unexpected error occurred",
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Users",
        description:
          "User management and authentication endpoints including MFA setup",
      },
      {
        name: "Teams",
        description: "Team management endpoints",
      },
      {
        name: "Categories",
        description: "Expense category management endpoints",
      },
      {
        name: "Expenses",
        description: "Expense tracking and management endpoints",
      },
      {
        name: "Reports",
        description: "Report generation and management endpoints",
      },
      {
        name: "Overview",
        description: "Budget overview and statistics endpoints",
      },
      {
        name: "Admin",
        description: "Admin-only operations",
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./app/routes/*.js"], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
