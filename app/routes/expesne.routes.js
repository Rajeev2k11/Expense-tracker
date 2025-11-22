const express = require('express');
const router = express.Router();
const { createExpense, getExpenseById, getExpensesByCategory, getExpensesByUser, getExpensesByTeam, getAllExpenses, updateExpense, deleteExpense } = require('../controller/expense.controller');


router.post('/', createExpense);

/**
 * @swagger
 * /api/v1/expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Expenses]
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
