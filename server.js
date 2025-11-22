const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const pinoHttp = require('pino-http');
const logger = require('./logger');
const authMiddleware = require('./app/middleware/auth.middleware');

const usersRoutes = require('./app/routes/users.routes')
const teamRoutes = require('./app/routes/team.routes');
const categoryRoutes = require('./app/routes/category.routes');
const expenseRoutes = require('./app/routes/expesne.routes');
const reportsRoutes = require('./app/routes/reports.routes');
// Load environment variables
dotenv.config()

const app = express()
const port = 3000

// Middleware to parse JSON (must be before routes)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(
  pinoHttp({
    logger,
    customLogLevel: (res, err) => {
      if (res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    }
  })
);

// connect database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log(err));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Expense Tracker API Documentation'
}));

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to Expense Tracker API! Visit <a href="/api-docs">/api-docs</a> for API documentation.')
})

app.use('/api/v1/users', usersRoutes)
app.use('/api/v1/teams', authMiddleware, teamRoutes)
app.use('/api/v1/categories', authMiddleware, categoryRoutes)
app.use('/api/v1/expenses', authMiddleware, expenseRoutes)
app.use('/api/v1/reports', authMiddleware, reportsRoutes)


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
  console.log(`📚 API Documentation: http://localhost:${port}/api-docs`)
})

