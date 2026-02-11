const express = require('express');
const router = express.Router();
const { createTeam, getTeamById, getAllTeams, updateTeam, inviteTeamMembers, removeTeamMember, updateTeamMemberRole, deleteTeam } = require('../controller/team.controller');

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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Development Team
 *               description:
 *                 type: string
 *                 description: Optional description for the team
 *                 example: Team responsible for building the core product
 *               team_leader:
 *                 type: string
 *                 nullable: true
 *                 description: User ID of the team leader. Defaults to the requesting admin if omitted.
 *                 example: 673abc123def456789012345
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional array of user IDs to add as team members
 *                 example: ["673abc123def456789012345"]
 *               monthly_budget:
 *                 type: number
 *                 nullable: true
 *                 description: Optional monthly budget allocation for the team
 *                 example: 5000
 *     responses:
 *       201:
 *         description: Team created successfully
 *       500:
 *         description: Failed to create team
 */
router.post('/', createTeam);

/**
 * @swagger
 * /api/v1/teams/{id}/invite-members:
 *   post:
 *     summary: Invite members to a team
 *     description: Allows the team manager to invite existing users to join the team. Sends an email to each invited user and marks their status as pending.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
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
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 description: Array of user IDs to invite to the team
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Invitations processed successfully
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the team manager can invite members
 *       404:
 *         description: Team or user not found
 *       500:
 *         description: Failed to invite team members
 */
router.post('/:id/invite-members', inviteTeamMembers);

/**
 * @swagger
 * /api/v1/teams/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove a team member
 *     description: Allows the team manager or an admin to remove a member from the team. Managers cannot remove other managers; only admins can do so.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the member to remove
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       400:
 *         description: Invalid team or member ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not allowed to remove this member
 *       404:
 *         description: Team or member not found
 *       500:
 *         description: Failed to remove team member
 */
router.delete('/:id/members/:memberId', removeTeamMember);

/**
 * @swagger
 * /api/v1/teams/{id}/members/{memberId}/role:
 *   patch:
 *     summary: Update a team member's role
 *     description: Allows only the team manager to change a member's role between MANAGER and MEMBER.
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Member ID whose role is being updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [MANAGER, MEMBER]
 *                 description: The new role for the member
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       400:
 *         description: Invalid team/member ID or role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only the team manager can change member roles
 *       404:
 *         description: Team or member not found
 *       500:
 *         description: Failed to update member role
 */
router.patch('/:id/members/:memberId/role', updateTeamMemberRole);

/**
 * @swagger
 * /api/v1/teams:
 *   get:
 *     summary: Get all teams
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
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
 *                   team_leader:
 *                     type: string
 *                   members:
 *                     type: array
 *                     items:
 *                       type: string
 *                   monthly_budget:
 *                     type: number
 *                   monthly_budget_remaining:
 *                     type: number
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
 *     security:
 *       - bearerAuth: []
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
 *     security:
 *       - bearerAuth: []
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
 *               description:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *               team_leader:
 *                 type: string
 *                 nullable: true
 *               monthly_budget:
 *                 type: number
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
 *     security:
 *       - bearerAuth: []
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
