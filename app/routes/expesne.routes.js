const express = require("express");
const router = express.Router();
const {
  createExpense,
  getExpenseById,
  listExpenses,
  getExpensesByCategory,
  getExpensesByUser,
  getExpensesByTeam,
  updateExpense,
  deleteExpense,
  approveOrRejectExpense,
} = require("../controller/expense.controller");
/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: Expense management
 */

/**
 * @swagger
 * /api/v1/expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - amount
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 example: Office Supplies
 *               amount:
 *                 type: number
 *                 example: 150.50
 *               category:
 *                 type: string
 *                 description: Category ID
 *                 example: 673abc123def456789012345
 *               description:
 *                 type: string
 *                 example: Purchased notebooks and pens
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-15
 *               user:
 *                 type: string
 *                 description: User ID
 *               team:
 *                 type: string
 *                 description: Team ID
 *     responses:
 *       201:
 *         description: Expense created successfully
 *       500:
 *         description: Failed to create expense
 */
router.post("/", createExpense);

/**
 * @swagger
 * /api/v1/expenses:
 *   get:
 *     summary: List expenses (current user's teams or created by user)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of expenses with category and created_at
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   category:
 *                     type: object
 *                   description:
 *                     type: string
 *                   date:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [pending, approved, rejected]
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Failed to list expenses
 */
router.get("/", listExpenses);

/**
 * @swagger
 * /api/v1/expenses/category/{categoryId}:
 *   get:
 *     summary: Get expenses by category
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: List of expenses for the category
 *       500:
 *         description: Failed to get expenses
 */
router.get("/category/:categoryId", getExpensesByCategory);

/**
 * @swagger
 * /api/v1/expenses/user/{userId}:
 *   get:
 *     summary: Get expenses by user
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of expenses for the user
 *       500:
 *         description: Failed to get expenses
 */
router.get("/user/:userId", getExpensesByUser);

/**
 * @swagger
 * /api/v1/expenses/team/{teamId}:
 *   get:
 *     summary: Get expenses by team
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     responses:
 *       200:
 *         description: List of expenses for the team
 *       500:
 *         description: Failed to get expenses
 */
router.get("/team/:teamId", getExpensesByTeam);

/**
 * @swagger
 * /api/v1/expenses/{id}:
 *   get:
 *     summary: Get expense by ID
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Expense ID
 *     responses:
 *       200:
 *         description: Expense details with created_at
 *       404:
 *         description: Expense not found
 *       500:
 *         description: Failed to get expense
 */
router.get("/:id", getExpenseById);

/**
 * @swagger
 * /api/v1/expenses/{id}/approval:
 *   patch:
 *     summary: Approve or reject expense (team manager only)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Expense ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: New approval status
 *     responses:
 *       200:
 *         description: Expense approved or rejected successfully
 *       403:
 *         description: Only team manager can approve/reject
 *       404:
 *         description: Expense not found
 *       500:
 *         description: Failed to update status
 */
router.patch("/:id/approval", approveOrRejectExpense);

/**
 * @swagger
 * /api/v1/expenses/{id}:
 *   put:
 *     summary: Update expense (creator or team manager only)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Expense ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Expense updated successfully
 *       403:
 *         description: Only creator or team manager can edit
 *       404:
 *         description: Expense not found
 *       500:
 *         description: Failed to update expense
 */
router.put("/:id", updateExpense);

/**
 * @swagger
 * /api/v1/expenses/{id}:
 *   delete:
 *     summary: Delete expense (creator or team manager only)
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Expense ID
 *     responses:
 *       200:
 *         description: Expense deleted successfully
 *       403:
 *         description: Only creator or team manager can delete
 *       404:
 *         description: Expense not found
 *       500:
 *         description: Failed to delete expense
 */
router.delete("/:id", deleteExpense);

module.exports = router;
