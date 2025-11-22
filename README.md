# Expense Tracker Backend API

A RESTful API for managing expenses, teams, categories, and reports with JWT authentication.

## Features

- ✅ User authentication with JWT
- ✅ Team management
- ✅ Category management
- ✅ Expense tracking
- ✅ Report generation
- ✅ Interactive API documentation with Swagger

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/expense_tracker_db?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key
```

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Documentation

Once the server is running, access the interactive Swagger documentation at:

**📚 http://localhost:3000/api-docs**

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response examples
- Try-it-out functionality to test endpoints directly
- Schema definitions

## Authentication

Most endpoints require JWT authentication. To use protected endpoints:

1. **Register** a new user at `POST /api/v1/users/register`
2. **Login** at `POST /api/v1/users/login` to receive a JWT token
3. In Swagger UI, click the **"Authorize"** button at the top
4. Enter your token in the format: `Bearer YOUR_TOKEN_HERE`
5. All subsequent requests will include the authentication token

## API Endpoints

### Users
- `POST /api/v1/users/register` - Register a new user
- `POST /api/v1/users/login` - Login user
- `GET /api/v1/users` - Get all users (protected)
- `GET /api/v1/users/:id` - Get user by ID (protected)

### Teams
- `POST /api/v1/teams` - Create a team
- `GET /api/v1/teams` - Get all teams
- `GET /api/v1/teams/:id` - Get team by ID
- `PUT /api/v1/teams/:id` - Update team
- `DELETE /api/v1/teams/:id` - Delete team

### Categories
- `POST /api/v1/categories` - Create a category
- `GET /api/v1/categories` - Get all categories
- `GET /api/v1/categories/:id` - Get category by ID
- `PUT /api/v1/categories/:id` - Update category
- `DELETE /api/v1/categories/:id` - Delete category

### Expenses
- `POST /api/v1/expenses` - Create an expense
- `GET /api/v1/expenses` - Get all expenses
- `GET /api/v1/expenses/:id` - Get expense by ID
- `GET /api/v1/expenses/category/:categoryId` - Get expenses by category
- `GET /api/v1/expenses/user/:userId` - Get expenses by user
- `GET /api/v1/expenses/team/:teamId` - Get expenses by team
- `PUT /api/v1/expenses/:id` - Update expense
- `DELETE /api/v1/expenses/:id` - Delete expense

### Reports
- `POST /api/v1/reports` - Create a report
- `GET /api/v1/reports` - Get all reports
- `GET /api/v1/reports/:id` - Get report by ID
- `PUT /api/v1/reports/:id` - Update report
- `DELETE /api/v1/reports/:id` - Delete report

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Swagger** - API documentation

## Project Structure

```
expense-tracker-backend/
├── app/
│   ├── controller/     # Business logic
│   ├── models/         # Database schemas
│   ├── routes/         # API routes
│   └── middleware/     # Custom middleware
├── node_modules/
├── .env                # Environment variables
├── .gitignore
├── package.json
├── server.js           # Entry point
├── swagger.js          # Swagger configuration
└── README.md
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for JWT signing | `your-secret-key` |

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

