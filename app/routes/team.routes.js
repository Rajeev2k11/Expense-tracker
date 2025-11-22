const express = require('express');
const router = express.Router();
const { createTeam, getTeamById, getAllTeams, updateTeam, deleteTeam } = require('../controller/team.controller');

/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: Team management
 */

/**
 * @swagger
 * /api/v1/teams:
 *   post:
 *     summary: Create a new team
 *     tags: [Teams]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - owner
 *             properties:
 *               name:
 *                 type: string
 *                 example: Development Team
 *               owner:
 *                 type: string
 *                 description: User ID of the team owner
 *                 example: 673abc123def456789012345
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs
 *                 example: ["673abc123def456789012345"]
 *     responses:
 *       201:
 *         description: Team created successfully
 *       500:
 *         description: Failed to create team
 */
router.post('/', createTeam);

/**
 * @swagger
 * /api/v1/teams:
 *   get:
 *     summary: Get all teams
 *     tags: [Teams]
 *     responses:
 *       200:
 *         description: List of all teams
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   owner:
 *                     type: string
 *                   members:
 *                     type: array
 *                     items:
 *                       type: string
 *       500:
 *         description: Failed to get teams
 */
router.get('/', getAllTeams);

/**
 * @swagger
 * /api/v1/teams/{id}:
 *   get:
 *     summary: Get team by ID
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Team details
 *       500:
 *         description: Failed to get team
 */
router.get('/:id', getTeamById);

/**
 * @swagger
 * /api/v1/teams/{id}:
 *   put:
 *     summary: Update team
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               owner:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Team updated successfully
 *       500:
 *         description: Failed to update team
 */
router.put('/:id', updateTeam);

/**
 * @swagger
 * /api/v1/teams/{id}:
 *   delete:
 *     summary: Delete team
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Team deleted successfully
 *       500:
 *         description: Failed to delete team
 */
router.delete('/:id', deleteTeam);

module.exports = router;
