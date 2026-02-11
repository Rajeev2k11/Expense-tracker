const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables FIRST before any other imports
dotenv.config();

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const pinoHttp = require("pino-http");
const logger = require("./logger");
const authMiddleware = require("./app/middleware/auth.middleware");

const usersRoutes = require("./app/routes/users.routes");
const teamRoutes = require("./app/routes/team.routes");
const categoryRoutes = require("./app/routes/category.routes");
const expenseRoutes = require("./app/routes/expesne.routes");
const reportsRoutes = require("./app/routes/reports.routes");
const overviewRoutes = require("./app/routes/read.routes");
const adminRoutes = require("./app/routes/admin.routes");
const superAdminRoutes = require("./app/routes/superAdmin.routes");
const {
  createFirstSuperAdmin,
  checkSuperAdminExists,
} = require("./app/controller/superAdmin.controller");

const app = express();
const port = 3000;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_APP_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// Middleware to parse JSON (must be before routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  pinoHttp({
    logger,
    customLogLevel: (res) => {
      if (res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }),
);

// connect database
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Expense Tracker API Documentation",
  }),
);

// Routes
app.get("/", (req, res) => {
  res.send(
    'Welcome to Expense Tracker API! Visit <a href="/api-docs">/api-docs</a> for API documentation.',
  );
});

app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/teams", authMiddleware, teamRoutes);
app.use("/api/v1/categories", authMiddleware, categoryRoutes);
app.use("/api/v1/expenses", authMiddleware, expenseRoutes);
app.use("/api/v1/reports", authMiddleware, reportsRoutes);
app.use("/api/v1/admin", authMiddleware, adminRoutes);
// Bootstrap routes (unprotected - for initial setup only)
// These must be registered BEFORE the protected routes
app.get("/api/v1/super-admin/bootstrap/check", checkSuperAdminExists);
app.post("/api/v1/super-admin/bootstrap/create", createFirstSuperAdmin);

// Protected super admin routes (registered after bootstrap to avoid route conflicts)
app.use("/api/v1/super-admin", authMiddleware, superAdminRoutes);
app.use("/api/v1/overview", overviewRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
});
