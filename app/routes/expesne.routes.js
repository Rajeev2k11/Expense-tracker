const express = require('express');
const router = express.Router();
const { createExpense, getExpenseById, getExpensesByCategory, getExpensesByUser, getExpensesByTeam, getAllExpenses, updateExpense, deleteExpense } = require('../controller/expense.controller');

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
router.post('/', createExpense);

/**
 * @swagger
 * /api/v1/expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all expenses
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
 *                     type: string
 *                   description:
 *                     type: string
 *                   date:
 *                     type: string
 *       500:
 *         description: Failed to get expenses
 */
router.get('/', getAllExpenses);

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
 *         description: Expense details
 *       500:
 *         description: Failed to get expense
 */
router.get('/:id', getExpenseById);

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
router.get('/category/:categoryId', getExpensesByCategory);

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
router.get('/user/:userId', getExpensesByUser);

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
router.get('/team/:teamId', getExpensesByTeam);

/**
 * @swagger
 * /api/v1/expenses/{id}:
 *   put:
 *     summary: Update expense
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
 *       500:
 *         description: Failed to update expense
 */
router.put('/:id', updateExpense);

/**
 * @swagger
 * /api/v1/expenses/{id}:
 *   delete:
 *     summary: Delete expense
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
 *       500:
 *         description: Failed to delete expense
 */
router.delete('/:id', deleteExpense);

module.exports = router;
