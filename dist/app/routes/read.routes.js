const express = require("express");
const router = express.Router();
const { getOverview, setBudget } = require("../controller/read.controller");
const authMiddleware = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Overview
 *   description: Budget overview and statistics
 */

/**
 * @swagger
 * /api/v1/overview:
 *   get:
 *     summary: Get budget overview with total spent and budget left
 *     tags: [Overview]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSpent:
 *                       type: number
 *                       example: 5000
 *                     totalBudget:
 *                       type: number
 *                       example: 10000
 *                     budgetLeft:
 *                       type: number
 *                       example: 5000
 *       500:
 *         description: Failed to fetch overview
 */
router.get("/", authMiddleware, getOverview);

/**
 * @swagger
 * /api/v1/overview/budget:
 *   post:
 *     summary: Set or update the total budget
 *     tags: [Overview]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totalBudget
 *             properties:
 *               totalBudget:
 *                 type: number
 *                 example: 10000
 *     responses:
 *       201:
 *         description: Budget set successfully
 *       400:
 *         description: Invalid totalBudget
 *       500:
 *         description: Failed to set budget
 */
router.post("/budget", authMiddleware, setBudget);

module.exports = router;
