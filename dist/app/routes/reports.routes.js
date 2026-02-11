const express = require("express");
const router = express.Router();
const {
  createReport,
  getReportById,
  getAllReports,
  updateReport,
  deleteReport,
} = require("../controller/reports.controller");

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Report management
 */

/**
 * @swagger
 * /api/v1/reports:
 *   post:
 *     summary: Create a new report
 *     tags: [Reports]
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
 *               - startDate
 *               - endDate
 *             properties:
 *               title:
 *                 type: string
 *                 example: Monthly Expense Report
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-01
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-31
 *               description:
 *                 type: string
 *                 example: January 2024 expenses
 *               team:
 *                 type: string
 *                 description: Team ID
 *               user:
 *                 type: string
 *                 description: User ID
 *     responses:
 *       201:
 *         description: Report created successfully
 *       500:
 *         description: Failed to create report
 */
router.post("/", createReport);

/**
 * @swagger
 * /api/v1/reports:
 *   get:
 *     summary: Get all reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all reports
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
 *                   startDate:
 *                     type: string
 *                   endDate:
 *                     type: string
 *                   description:
 *                     type: string
 *       500:
 *         description: Failed to get reports
 */
router.get("/", getAllReports);

/**
 * @swagger
 * /api/v1/reports/{id}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details
 *       500:
 *         description: Failed to get report
 */
router.get("/:id", getReportById);

/**
 * @swagger
 * /api/v1/reports/{id}:
 *   put:
 *     summary: Update report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report updated successfully
 *       500:
 *         description: Failed to update report
 */
router.put("/:id", updateReport);

/**
 * @swagger
 * /api/v1/reports/{id}:
 *   delete:
 *     summary: Delete report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *       500:
 *         description: Failed to delete report
 */
router.delete("/:id", deleteReport);

module.exports = router;
