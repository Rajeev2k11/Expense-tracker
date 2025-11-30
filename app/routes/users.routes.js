// app/routes/users.routes.js

const express = require('express');
const router = express.Router();
const { 
    getAllUsers, 
    getUserById, 
    loginUser, 
    inviteUser, 
    setupPassword, 
    selectMfaMethod, 
    verifyMfa,
    generatePasskeyAuthOptions,
    verifyPasskeyAuth
} = require('../controller/users.controller');
const authMiddleware = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * /api/v1/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Failed to login
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
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
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to get users
 */
router.get('/', authMiddleware, getAllUsers);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to get user
 */
router.get('/:id', authMiddleware, getUserById);

router.post('/invite', authMiddleware, inviteUser);

/**
 * @swagger
 * /api/v1/users/setup-password:
 *   post:
 *     summary: Setup password for invited user
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Invitation token received via email
 *                 example: 51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MySecurePassword123!
 *     responses:
 *       200:
 *         description: Password setup successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 challengeId:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Invalid or expired token
 *       500:
 *         description: Failed to setup password
 */
router.post('/setup-password', setupPassword);

/**
 * @swagger
 * /api/v1/users/invite:
 *   post:
 *     summary: Invite a user by email
 *     tags: [Users]
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
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: User invited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to invite user
 */
/**
 * @swagger
 * /api/v1/users/select-mfa-method:
 *   post:
 *     summary: Select MFA method and get QR code for TOTP
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - challengeId
 *               - mfaMethod
 *             properties:
 *               challengeId:
 *                 type: string
 *                 description: Challenge ID from password setup
 *                 example: 51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a
 *               mfaMethod:
 *                 type: string
 *                 enum: [TOTP, PASSKEY]
 *                 description: MFA method to use
 *                 example: TOTP
 *     responses:
 *       200:
 *         description: MFA method selected and QR code generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 challengeId:
 *                   type: string
 *                 secret:
 *                   type: string
 *                   description: TOTP secret (manual entry backup)
 *                 qrCode:
 *                   type: string
 *                   description: Base64 encoded QR code image
 *                 otpAuthUrl:
 *                   type: string
 *                   description: OTP Auth URL for QR code
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Invalid challenge
 *       500:
 *         description: Failed to setup MFA
 */
router.post('/select-mfa-method', selectMfaMethod);

/**
 * @swagger
 * /api/v1/users/verify-mfa:
 *   post:
 *     summary: Verify MFA (supports both TOTP and PASSKEY)
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - challengeId
 *             properties:
 *               challengeId:
 *                 type: string
 *                 description: Challenge ID from MFA setup
 *                 example: 51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a
 *               totpCode:
 *                 type: string
 *                 description: 6-digit code from authenticator app (required for TOTP)
 *                 example: "123456"
 *               credential:
 *                 type: object
 *                 description: Credential from navigator.credentials.create() (required for PASSKEY)
 *     responses:
 *       200:
 *         description: MFA verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
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
 *                     mfa_enabled:
 *                       type: boolean
 *                     mfa_method:
 *                       type: string
 *                       enum: [TOTP, PASSKEY]
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Invalid verification code/credential or challenge
 *       500:
 *         description: Failed to verify MFA
 */
router.post('/verify-mfa', verifyMfa);

/**
 * @swagger
 * /api/v1/users/passkey-auth-options:
 *   post:
 *     summary: Generate authentication options for passkey login
 *     tags: [Users]
 *     security: []
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
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Authentication options generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 options:
 *                   type: object
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/passkey-auth-options', generatePasskeyAuthOptions);

/**
 * @swagger
 * /api/v1/users/passkey-auth-verify:
 *   post:
 *     summary: Verify passkey authentication for login
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - credential
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               credential:
 *                 type: object
 *                 description: Credential from navigator.credentials.get()
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Server error
 */
router.post('/passkey-auth-verify', verifyPasskeyAuth);

module.exports = router;
