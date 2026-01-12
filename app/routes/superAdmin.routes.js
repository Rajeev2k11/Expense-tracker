const express = require('express');
const router = express.Router();
const { 
    createAdmin,
    getPendingAdminInvitations,
    acceptPendingAdminInvitation,
    rejectPendingAdminInvitation,
    getPendingAdminInvitationById,
    createFirstSuperAdmin,
    checkSuperAdminExists
} = require('../controller/superAdmin.controller');
const authMiddleware = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Super Admin
 *   description: Super Admin operations for managing admin users
 */

/**
 * @swagger
 * /api/v1/super-admin/bootstrap/check:
 *   get:
 *     summary: Check if super admin exists
 *     description: |
 *       Check if a super admin has been created in the system.
 *       This endpoint is unprotected and helps determine if bootstrap is needed.
 *     tags: [Super Admin]
 *     security: []
 *     responses:
 *       200:
 *         description: Super admin status check
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No super admin found. Bootstrap endpoint available.
 *                 requiresBootstrap:
 *                   type: boolean
 *                   example: true
 */
router.get('/bootstrap/check', checkSuperAdminExists);

/**
 * @swagger
 * /api/v1/super-admin/bootstrap/create:
 *   post:
 *     summary: Create the first super admin (Bootstrap)
 *     description: |
 *       Creates the first super admin user in the system. This endpoint is unprotected
 *       and should only be used during initial setup.
 *       
 *       **Security**: 
 *       - Optionally protected by BOOTSTRAP_SECRET_KEY environment variable
 *       - If BOOTSTRAP_SECRET_KEY is set, you must provide it in the request
 *       - If a super admin already exists and no secret is set, this will fail
 *       
 *       After creating the first super admin, use authenticated endpoints to create more admins.
 *     tags: [Super Admin]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - username
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name of the super admin
 *                 example: Super Admin
 *               username:
 *                 type: string
 *                 description: Unique username
 *                 example: superadmin
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *                 example: superadmin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password (min 8 characters recommended)
 *                 example: SuperSecurePassword123!
 *               secretKey:
 *                 type: string
 *                 description: Bootstrap secret key (required if BOOTSTRAP_SECRET_KEY env var is set)
 *                 example: your-secret-bootstrap-key
 *           examples:
 *             basic:
 *               summary: Basic bootstrap
 *               value:
 *                 name: Super Admin
 *                 username: superadmin
 *                 email: superadmin@example.com
 *                 password: SecurePassword123!
 *             withSecret:
 *               summary: With bootstrap secret
 *               value:
 *                 name: Super Admin
 *                 username: superadmin
 *                 email: superadmin@example.com
 *                 password: SecurePassword123!
 *                 secretKey: your-secret-bootstrap-key
 *     responses:
 *       201:
 *         description: First super admin created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: First super admin created successfully. Please setup MFA.
 *                 challengeId:
 *                   type: string
 *                   description: Challenge ID for MFA setup
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       example: ADMIN
 *                     status:
 *                       type: string
 *                       example: active
 *                 note:
 *                   type: string
 *                   example: Use the challengeId to setup MFA before logging in.
 *       400:
 *         description: Bad request - validation error or user already exists
 *       403:
 *         description: Forbidden - super admin already exists or invalid secret
 *       500:
 *         description: Internal server error
 */
router.post('/bootstrap/create', createFirstSuperAdmin);

/**
 * @swagger
 * /api/v1/super-admin/create-admin:
 *   post:
 *     summary: Invite a new admin user
 *     description: |
 *       Creates a new admin user by sending an invitation email. The invited user will receive
 *       an email with a link to set their password. Once the password is set, they will need
 *       to complete MFA setup before being able to login.
 *       
 *       The role will always be set to 'ADMIN' for users created through this endpoint.
 *       
 *       **Authentication Required**: This endpoint requires a valid JWT token in the Authorization header.
 *       Format: `Authorization: Bearer <your-token>`
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the admin to invite
 *                 example: admin@example.com
 *               name:
 *                 type: string
 *                 description: Full name of the admin (optional, defaults to email prefix if not provided)
 *                 example: John Admin
 *               username:
 *                 type: string
 *                 description: Username for the admin (optional, defaults to email prefix if not provided)
 *                 example: johndoe
 *           examples:
 *             basic:
 *               summary: Basic invitation
 *               value:
 *                 email: admin@example.com
 *             withNameAndUsername:
 *               summary: Invitation with name and username
 *               value:
 *                 email: admin@example.com
 *                 name: John Admin
 *                 username: johnadmin
 *     responses:
 *       200:
 *         description: Admin invitation sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Admin invited successfully
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: admin@example.com
 *             examples:
 *               newInvitation:
 *                 value:
 *                   message: Admin invited successfully
 *                   email: admin@example.com
 *               resendInvitation:
 *                 value:
 *                   message: Admin invitation resent successfully
 *                   email: admin@example.com
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               missingEmail:
 *                 value:
 *                   message: Email is required
 *               userAccepted:
 *                 value:
 *                   message: User has already accepted the invitation
 *               usernameTaken:
 *                 value:
 *                   message: Username is already taken. Please provide a different username.
 *       401:
 *         description: Unauthorized - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to create admin
 *                 error:
 *                   type: string
 *                   example: Detailed error message
 */
router.post('/create-admin', authMiddleware, createAdmin);

/**
 * @swagger
 * /api/v1/super-admin/pending-invitations:
 *   get:
 *     summary: Get all pending admin invitations
 *     description: |
 *       Retrieves a list of all admin users with pending invitations.
 *       This endpoint allows super admins to view all pending admin invitations
 *       that haven't been accepted yet.
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending admin invitations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pending admin invitations retrieved successfully
 *                 count:
 *                   type: number
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       name:
 *                         type: string
 *                       username:
 *                         type: string
 *                       role:
 *                         type: string
 *                         example: ADMIN
 *                       invitation:
 *                         type: string
 *                         example: pending
 *                       status:
 *                         type: string
 *                         example: pending
 *                       invitedBy:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/pending-invitations', authMiddleware, getPendingAdminInvitations);

/**
 * @swagger
 * /api/v1/super-admin/pending-invitations/{userId}:
 *   get:
 *     summary: Get details of a specific pending admin invitation
 *     description: |
 *       Retrieves detailed information about a specific pending admin invitation
 *       including the user who sent the invitation.
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the pending admin
 *     responses:
 *       200:
 *         description: Pending admin invitation retrieved successfully
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
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *                     invitation:
 *                       type: string
 *                     status:
 *                       type: string
 *                     invitedBy:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *       404:
 *         description: Pending admin invitation not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/pending-invitations/:userId', authMiddleware, getPendingAdminInvitationById);

/**
 * @swagger
 * /api/v1/super-admin/pending-invitations/{userId}/accept:
 *   post:
 *     summary: Accept/Approve a pending admin invitation
 *     description: |
 *       Approves a pending admin invitation, changing the user's status to 'active'.
 *       This allows the admin user to access the system after they have set their password.
 *       
 *       Note: The admin user must still set their password using the invitation token
 *       before they can login. This endpoint approves their admin status.
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the pending admin to approve
 *     responses:
 *       200:
 *         description: Admin invitation approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Admin invitation approved successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *                       example: ADMIN
 *                     status:
 *                       type: string
 *                       example: active
 *                     invitation:
 *                       type: string
 *                       example: pending
 *       400:
 *         description: Bad request - invitation token expired or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invitation token is expired or invalid. Please resend the invitation first.
 *       404:
 *         description: Pending admin invitation not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/pending-invitations/:userId/accept', authMiddleware, acceptPendingAdminInvitation);

/**
 * @swagger
 * /api/v1/super-admin/pending-invitations/{userId}/reject:
 *   post:
 *     summary: Reject/Cancel a pending admin invitation
 *     description: |
 *       Rejects a pending admin invitation, marking it as 'rejected' and setting
 *       the user status to 'inactive'. This cancels the invitation and prevents
 *       the user from accessing the system.
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the pending admin to reject
 *     responses:
 *       200:
 *         description: Admin invitation rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Admin invitation rejected successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: inactive
 *                     invitation:
 *                       type: string
 *                       example: rejected
 *       404:
 *         description: Pending admin invitation not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/pending-invitations/:userId/reject', authMiddleware, rejectPendingAdminInvitation);

module.exports = router;