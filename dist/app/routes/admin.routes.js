const express = require("express");
const router = express.Router();
const { createCategory } = require("../controller/category.controller");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin operations
 */

/**
 * @swagger
 * /api/v1/admin/create-category:
 *   post:
 *     summary: Create a new category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - color
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the category
 *               description:
 *                 type: string
 *                 description: The description of the category
 *               color:
 *                 type: string
 *                 description: The color of the category
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message of the response
 *                 category:
 *                   type: object
 *                   description: The category object
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post("/create-category", createCategory);

module.exports = router;
