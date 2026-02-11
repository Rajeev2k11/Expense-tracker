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
    verifyMfaSetup,
    verifyLoginMfa,
    generatePasskeyAuthOptions,
    verifyPasskeyAuth,
    signUpAdmin,
    getUserTeams,
    setUserDefaultTeam,
    setUserActiveTeam,
    getCurrentUserProfile
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
 * /api/v1/users/readUserProfile:
 *   get:
 *     summary: Get current user profile with teams and role
 *     description: |
 *       Returns the currently authenticated user's profile information including:
 *       - User details (id, name, username, email, role, status, member_type)
 *       - Default team (first team where user is leader, or first team where user is member)
 *       - Active team (configurable via the switch-team endpoint)
 *       - All teams the user is associated with (as leader or member)
 *       
 *       This endpoint should be called after login to get user context.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                       enum: [ADMIN, USER, SUPER_ADMIN]
 *                       example: ADMIN
 *                     status:
 *                       type: string
 *                       enum: [active, inactive, pending]
 *                       example: active
 *                     member_type:
 *                       type: string
 *                       enum: [MANAGER, MEMBER]
 *                       example: MEMBER
 *                 defaultTeam:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     team_leader:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                     monthly_budget:
 *                       type: number
 *                     monthly_budget_remaining:
 *                       type: number
 *                 activeTeam:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     team_leader:
 *                       type: object
 *                     members:
 *                       type: array
 *                     monthly_budget:
 *                       type: number
 *                     monthly_budget_remaining:
 *                       type: number
 *                 allTeams:
 *                   type: array
 *                   items:
 *                     type: object
 *             examples:
 *               withTeams:
 *                 summary: User with teams
 *                 value:
 *                   user:
 *                     id: "673abc123def456789012345"
 *                     name: "John Doe"
 *                     username: "johndoe"
 *                     email: "john@example.com"
 *                     role: "ADMIN"
 *                     status: "active"
 *                     member_type: "MEMBER"
 *                   defaultTeam:
 *                     id: "673def456abc789012345678"
 *                     name: "Development Team"
 *                     description: "Main development team"
 *                     team_leader:
 *                       _id: "673abc123def456789012345"
 *                       name: "John Doe"
 *                       username: "johndoe"
 *                       email: "john@example.com"
 *                       role: "ADMIN"
 *                     members: []
 *                     monthly_budget: 10000
 *                     monthly_budget_remaining: 7500
 *                   activeTeam:
 *                     id: "673def456abc789012345678"
 *                     name: "Development Team"
 *                     description: "Main development team"
 *                     team_leader:
 *                       _id: "673abc123def456789012345"
 *                       name: "John Doe"
 *                       username: "johndoe"
 *                       email: "john@example.com"
 *                       role: "ADMIN"
 *                     members: []
 *                     monthly_budget: 10000
 *                     monthly_budget_remaining: 7500
 *                   allTeams:
 *                     - id: "673def456abc789012345678"
 *                       name: "Development Team"
 *               withoutTeams:
 *                 summary: User without teams
 *                 value:
 *                   user:
 *                     id: "673abc123def456789012345"
 *                     name: "John Doe"
 *                     username: "johndoe"
 *                     email: "john@example.com"
 *                     role: "USER"
 *                     status: "active"
 *                     member_type: "MEMBER"
 *                   defaultTeam: null
 *                   activeTeam: null
 *                   allTeams: []
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
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to get user profile
 */
router.get('/readUserProfile', authMiddleware, getCurrentUserProfile);

/**
 * @swagger
 * /api/v1/users/teams:
 *   get:
 *     summary: Get teams for current user
 *     description: Returns all teams where the authenticated user is a team leader or a member.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teams retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 defaultTeamId:
 *                   type: string
 *                   nullable: true
 *                   description: ID of the user's default team, if set
 *                 defaultTeam:
 *                   type: object
 *                   nullable: true
 *                   description: Detailed information for the default team when available
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     team_leader:
 *                       type: object
 *                       description: Team leader details
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Team member details
 *                     monthly_budget:
 *                       type: number
 *                     monthly_budget_remaining:
 *                       type: number
 *                 activeTeamId:
 *                   type: string
 *                   nullable: true
 *                   description: ID of the user's active team, if set
 *                 activeTeam:
 *                   type: object
 *                   nullable: true
 *                   description: Detailed information for the active team when available
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     team_leader:
 *                       type: object
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                     monthly_budget:
 *                       type: number
 *                     monthly_budget_remaining:
 *                       type: number
 *                 teams:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Team identifier
 *                       name:
 *                         type: string
 *                         description: Team name
 *                       description:
 *                         type: string
 *                         description: Team description
 *                       team_leader:
 *                         $ref: '#/components/schemas/User'
 *                       members:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/User'
 *                       monthly_budget:
 *                         type: number
 *                         description: Monthly budget allocated to the team
 *                       monthly_budget_remaining:
 *                         type: number
 *                         description: Remaining monthly budget for the team
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to get user teams
 */
router.get('/teams', authMiddleware, getUserTeams);

/**
 * @swagger
 * /api/v1/users/teams/default:
 *   patch:
 *     summary: Set default team for current user
 *     description: Updates the default team for the authenticated user. The user must belong to the team as a leader or member.
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
 *               - teamId
 *             properties:
 *               teamId:
 *                 type: string
 *                 description: ID of the team to set as default
 *     responses:
 *       200:
 *         description: Default team updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 defaultTeamId:
 *                   type: string
 *                   description: Newly set default team ID
 *                 defaultTeam:
 *                   type: object
 *                   description: Details of the default team
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User is not part of the specified team
 *       404:
 *         description: User or team not found
 *       500:
 *         description: Failed to set default team
 */
router.patch('/teams/default', authMiddleware, setUserDefaultTeam);

/**
 * @swagger
 * /api/v1/users/switch-team:
 *   patch:
 *     summary: Switch active team for current user
 *     description: Switches the authenticated user's active team. The user must belong to the specified team.
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
 *               - teamId
 *             properties:
 *               teamId:
 *                 type: string
 *                 description: ID of the team to switch to
 *     responses:
 *       200:
 *         description: Active team switched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 activeTeamId:
 *                   type: string
 *                   description: Newly set active team ID
 *                 activeTeam:
 *                   type: object
 *                   description: Details of the active team
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User is not part of the specified team
 *       404:
 *         description: User or team not found
 *       500:
 *         description: Failed to switch active team
 */
router.patch('/switch-team', authMiddleware, setUserActiveTeam);

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
 * /api/v1/users/verify-mfa-setup:
 *   post:
 *     summary: Verify MFA setup during registration (supports both TOTP and PASSKEY)
 *     description: |
 *       **REGISTRATION/SETUP ENDPOINT** - Verifies the MFA setup by checking the TOTP code or passkey credential. 
 *       This endpoint is used during the initial MFA setup process after selecting the MFA method.
 *       
 *       **Use this endpoint for:**
 *       - Initial MFA setup after password setup
 *       - Admin registration MFA setup
 *       - First-time MFA configuration
 *       
 *       **For TOTP Method**: 
 *       - Required fields: `challengeId` + `code` (6-digit number)
 *       - Send the 6-digit code from your authenticator app (Google Authenticator, Authy, etc.)
 *       
 *       **For PASSKEY Method**: 
 *       - Required fields: `challengeId` + `credential` (WebAuthn credential object)
 *       - Send the complete credential object from navigator.credentials.create()
 *       - The credential must include: id, rawId, response (clientDataJSON, attestationObject), type
 *       
 *       On successful verification, the user's MFA will be enabled, the account will be activated, 
 *       and a JWT token will be returned for authentication.
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 title: TOTP Verification
 *                 required:
 *                   - challengeId
 *                   - code
 *                 properties:
 *                   challengeId:
 *                     type: string
 *                     description: Challenge ID received from select-mfa-method endpoint
 *                     example: 51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a
 *                   code:
 *                     type: string
 *                     description: 6-digit TOTP code from authenticator app (Google Authenticator, Authy, etc.)
 *                     example: "123456"
 *                     pattern: "^[0-9]{6}$"
 *               - type: object
 *                 title: PASSKEY Verification
 *                 required:
 *                   - challengeId
 *                   - credential
 *                 properties:
 *                   challengeId:
 *                     type: string
 *                     description: Challenge ID received from select-mfa-method endpoint
 *                     example: 51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a
 *                   credential:
 *                     type: object
 *                     description: WebAuthn credential object from navigator.credentials.create()
 *                     required:
 *                       - id
 *                       - rawId
 *                       - response
 *                       - type
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Base64url encoded credential ID
 *                         example: "AQEBAgMFCA0VIjdZEGl5Yls"
 *                       rawId:
 *                         type: string
 *                         description: Base64url encoded raw credential ID
 *                         example: "AQEBAgMFCA0VIjdZEGl5Yls"
 *                       response:
 *                         type: object
 *                         required:
 *                           - clientDataJSON
 *                           - attestationObject
 *                         properties:
 *                           clientDataJSON:
 *                             type: string
 *                             description: Base64url encoded client data JSON
 *                             example: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiTXpZMU5qVT..."
 *                           attestationObject:
 *                             type: string
 *                             description: Base64url encoded attestation object
 *                             example: "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVikSZYN5Yx..."
 *                           transports:
 *                             type: array
 *                             description: Transport methods supported by the authenticator
 *                             items:
 *                               type: string
 *                               enum: [usb, nfc, ble, internal, hybrid]
 *                             example: ["internal", "hybrid"]
 *                       type:
 *                         type: string
 *                         description: Credential type
 *                         enum: [public-key]
 *                         example: "public-key"
 *                       clientExtensionResults:
 *                         type: object
 *                         description: Client extension results (usually empty object)
 *                         example: {}
 *                       authenticatorAttachment:
 *                         type: string
 *                         description: Type of authenticator used
 *                         enum: [platform, cross-platform]
 *                         example: "platform"
 *           examples:
 *             totpExample:
 *               summary: TOTP Code Verification
 *               description: Use this format when verifying TOTP (6-digit code from authenticator app)
 *               value:
 *                 challengeId: "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a"
 *                 code: "123456"
 *             passkeyExample:
 *               summary: Passkey Credential Verification
 *               description: Use this format when verifying PASSKEY (WebAuthn credential from browser)
 *               value:
 *                 challengeId: "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a"
 *                 credential:
 *                   id: "AQEBAgMFCA0VIjdZEGl5Yls"
 *                   rawId: "AQEBAgMFCA0VIjdZEGl5Yls"
 *                   response:
 *                     clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiTXpZMU5qVTJOelE1TnpReU1EQXhOekl4TnpJd01UY3lNREl4TnpJd01UY3lNREl4TnpJd01UY3lNREl4TnpJd01UY3lNREl4TnpJd01UY3lNREl4TnpJd01UY3lNREl4TnpJd01UY3lNREl4TnpJd01UY3lNREl4TnpJd01UY3lNREkxTmpVMk56UTVOelF5TURBeE56SXhOekl3TVRjeU1ESXhOekl3TVRjeU1ESXhOekl3TVRjeU1ESXhOekl3TVRjeU1ESXhOekl3TVRjeU1ESXhOekl3TVRjeU1ESXhOekl3TVRjeU1ESXhOekl3TVRjeU1ESTFOalUyTnpRNU56UXlNREF4TnpJeE56SXdNVGN5TURJeE56SXdNVGN5TURJeE56SXdNVGN5TURJeE56SXdNVGN5TURJeE56SXdNVGN5TURJeE56SXdNVGN5TURJeE56SXdNVGN5TURJeE56SXdNVGN5TURJMU5qVTJOelE1TnpReU1EQXhOekl4TnpJdwogICAiLCJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJjcm9zc09yaWdpbiI6ZmFsc2V9"
 *                     attestationObject: "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVikSZYN5YxvLEqjWNHCdN0x4I0HjJ2FQJqF0FdLEqjW"
 *                     transports: ["internal", "hybrid"]
 *                   type: "public-key"
 *                   clientExtensionResults: {}
 *                   authenticatorAttachment: "platform"
 *     responses:
 *       200:
 *         description: MFA verified and enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating which MFA method was verified
 *                   example: TOTP MFA verified and enabled successfully
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication (valid for 1 hour)
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MzdhMTIzNDU2Nzg5MGFiY2RlZjAxMjMiLCJpYXQiOjE2ODc1Mjc2MDB9.abc123def456
 *                 user:
 *                   type: object
 *                   description: User object with updated MFA information
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User's unique identifier
 *                       example: 637a12345678900abcdef0123
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: User's email address
 *                       example: user@example.com
 *                     name:
 *                       type: string
 *                       description: User's full name
 *                       example: John Doe
 *                     username:
 *                       type: string
 *                       description: User's username
 *                       example: johndoe
 *                     role:
 *                       type: string
 *                       description: User's role in the system
 *                       enum: [admin, user, manager]
 *                       example: user
 *                     mfa_enabled:
 *                       type: boolean
 *                       description: Whether MFA is enabled for this user
 *                       example: true
 *                     mfa_method:
 *                       type: string
 *                       description: The MFA method that was setup
 *                       enum: [TOTP, PASSKEY]
 *                       example: TOTP
 *       400:
 *         description: Bad Request - Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               examples:
 *                 missingChallengeId:
 *                   value:
 *                     message: Challenge ID is required
 *                 missingCode:
 *                   value:
 *                     message: TOTP code is required
 *                 missingCredential:
 *                   value:
 *                     message: Passkey credential is required
 *                 methodNotSelected:
 *                   value:
 *                     message: MFA method not selected. Please select MFA method first.
 *                 incompleteCredential:
 *                   value:
 *                     message: Incomplete credential data received
 *       401:
 *         description: Unauthorized - Invalid verification code/credential or challenge
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               examples:
 *                 invalidChallenge:
 *                   value:
 *                     message: Invalid or expired challenge
 *                 invalidCode:
 *                   value:
 *                     message: Invalid TOTP code. Please try again.
 *                 passkeyFailed:
 *                   value:
 *                     message: Passkey verification failed
 *       500:
 *         description: Internal Server Error - Failed to verify MFA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Failed to verify MFA
 *                 error:
 *                   type: string
 *                   description: Detailed error message
 *                   example: Internal server error
 */
router.post('/verify-mfa-setup', verifyMfaSetup);

/**
 * @swagger
 * /api/v1/users/verify-login-mfa:
 *   post:
 *     summary: Verify MFA for user login/authentication (supports both TOTP and PASSKEY)
 *     description: |
 *       **AUTHENTICATION/LOGIN ENDPOINT** - Verifies MFA for user login after successful password verification. 
 *       Supports both TOTP and PASSKEY MFA methods.
 *       
 *       **Use this endpoint for:**
 *       - Login authentication after password verification
 *       - Daily login with MFA
 *       - Re-authentication
 *       
 *       **For TOTP MFA:**
 *       - Required: `challengeId` + `totpCode` (6-digit code from authenticator app)
 *       - challengeId is received from login endpoint
 *       
 *       **For PASSKEY MFA:**
 *       - Required: `challengeId` + `credential` (WebAuthn credential object from browser)
 *       - challengeId is received from login endpoint
 *       - passkeyOptions are included in login response
 *       - The credential must be obtained using `navigator.credentials.get()` with passkeyOptions from login
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 title: TOTP Verification
 *                 required:
 *                   - challengeId
 *                   - totpCode
 *                 properties:
 *                   challengeId:
 *                     type: string
 *                     description: Challenge ID received from login endpoint
 *                     example: 51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a
 *                   totpCode:
 *                     type: string
 *                     description: 6-digit code from authenticator app
 *                     example: "123456"
 *               - type: object
 *                 title: PASSKEY Verification
 *                 required:
 *                   - challengeId
 *                   - credential
 *                 properties:
 *                   challengeId:
 *                     type: string
 *                     description: Challenge ID received from login endpoint
 *                     example: 51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a
 *                   credential:
 *                     type: object
 *                     description: WebAuthn credential object from navigator.credentials.get()
 *                     required:
 *                       - id
 *                       - rawId
 *                       - response
 *                       - type
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Base64url encoded credential ID
 *                       rawId:
 *                         type: string
 *                         description: Base64url encoded raw credential ID
 *                       response:
 *                         type: object
 *                         required:
 *                           - clientDataJSON
 *                           - authenticatorData
 *                           - signature
 *                         properties:
 *                           clientDataJSON:
 *                             type: string
 *                             description: Base64url encoded client data JSON
 *                           authenticatorData:
 *                             type: string
 *                             description: Base64url encoded authenticator data
 *                           signature:
 *                             type: string
 *                             description: Base64url encoded signature
 *                           userHandle:
 *                             type: string
 *                             description: Base64url encoded user handle
 *                       type:
 *                         type: string
 *                         enum: [public-key]
 *           examples:
 *             totpExample:
 *               summary: TOTP Verification
 *               value:
 *                 challengeId: "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a"
 *                 totpCode: "123456"
 *             passkeyExample:
 *               summary: PASSKEY Verification
 *               value:
 *                 challengeId: "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a"
 *                 credential:
 *                   id: "AQEBAgMFCA0VIjdZEGl5Yls"
 *                   rawId: "AQEBAgMFCA0VIjdZEGl5Yls"
 *                   response:
 *                     clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoi..."
 *                     authenticatorData: "..."
 *                     signature: "..."
 *                   type: "public-key"
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
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
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
 *                       example: user
 *                     mfa_method:
 *                       type: string
 *       400:
 *         description: Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               examples:
 *                 missingChallengeId:
 *                   value:
 *                     message: Challenge ID is required
 *                 missingTotpCode:
 *                   value:
 *                     message: TOTP code is required
 *                 missingCredential:
 *                   value:
 *                     message: Passkey credential is required
 *                 noChallenge:
 *                   value:
 *                     message: No authentication challenge found. Please generate passkey auth options first.
 *       401:
 *         description: Invalid challenge, TOTP code, or passkey authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               examples:
 *                 invalidChallenge:
 *                   value:
 *                     message: Invalid or expired challenge
 *                 invalidTotp:
 *                   value:
 *                     message: Invalid TOTP code. Please try again.
 *                 credentialNotFound:
 *                   value:
 *                     message: Credential not found
 *                 passkeyFailed:
 *                   value:
 *                     message: Passkey authentication failed
 *       500:
 *         description: Failed to verify MFA
 */
router.post('/verify-login-mfa', verifyLoginMfa);

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

/**
 * @swagger
 * /api/v1/users/signup-admin:
 *   post:
 *     summary: Register a new admin user
 *     description: Creates a new admin account. After registration, admin must setup MFA using the returned challengeId.
 *     tags: [Users]
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
 *                 description: Full name of the admin
 *                 example: John Doe
 *               username:
 *                 type: string
 *                 description: Unique username
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin email address
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password (min 8 characters recommended)
 *                 example: SecurePassword123!
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Admin registered successfully. Please setup MFA.
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
 *                       example: admin
 *       400:
 *         description: Missing required fields or user already exists
 *       500:
 *         description: Failed to register admin
 */
router.post('/signup-admin', signUpAdmin);

module.exports = router;
