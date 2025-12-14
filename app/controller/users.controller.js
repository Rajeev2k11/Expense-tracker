const User = require('../models/users.models');
const bcrypt = require('bcrypt');
const { Resend } = require("resend");
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const resend = new Resend(process.env.RESEND_API_KEY);

// WebAuthn configuration
const rpName = 'Expense Tracker';
const rpID = process.env.RP_ID || 'localhost'; // Your domain (e.g., 'example.com')
const origin = process.env.FRONTEND_APP_URL || 'http://localhost:3001';

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get users', error: error.message });
    }
}

const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get user', error: error.message });
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        // Compare password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        
        // Admin can login directly without MFA
        if (user.role === 'admin') {
            // Update status to active if pending
            if (user.status === 'pending') {
                user.status = 'active';
                await user.save();
            }
            
            // Generate JWT token
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            
            return res.status(200).json({ 
                message: 'Login successful',
                token: token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                    role: user.role
                }
            });
        }
        
        // Normal users need MFA verification
        if (!user.mfa_enabled) {
            return res.status(401).json({ message: 'MFA is not enabled. Please complete MFA setup.' });
        }
        
        // Generate challengeId for MFA verification
        const challengeId = crypto.randomBytes(24).toString("hex");
        user.challengeId = challengeId;
        await user.save();
        
        res.status(200).json({ 
            message: 'Password is correct. Please verify MFA.',
            mfa_method: user.mfa_method,
            challengeId: challengeId
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to login', error: error.message });
    }
}
//invite user by sending email
const inviteUser = async (req, res) => {
    try {
       const {email, role, name, username} = req.body;
       
       if (!email) {
           return res.status(400).json({ message: 'Email is required' });
       }
       
       // Get the inviting user from auth middleware
       const invitingUser = await User.findById(req.userId);
       
       if (!invitingUser) {
           return res.status(401).json({ message: 'Unauthorized' });
       }
       
       // Generate invite token
       const token = crypto.randomBytes(32).toString("hex");
       const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
       const inviteUrl = `${process.env.FRONTEND_APP_URL}/set-password?token=${token}`;
       
       // Check if user already exists by email
       let existingUser = await User.findOne({ email });
       let isResend = false;
       
       if (existingUser) {
           // If user already accepted invitation, don't allow resend
           if (existingUser.invitation === 'accepted') {
               return res.status(400).json({ message: 'User has already accepted the invitation' });
           }
           
           // Update existing user with new invite token
           existingUser.inviteToken = token;
           existingUser.inviteTokenExpiry = tokenExpiry;
           existingUser.invitedBy = invitingUser._id.toString();
           if (role) existingUser.role = role;
           if (name) existingUser.name = name;
           await existingUser.save();
           isResend = true;
       } else {
           // Check if username already exists
           const usernameToUse = username || email.split('@')[0];
           const existingUsername = await User.findOne({ username: usernameToUse });
           if (existingUsername) {
               return res.status(400).json({ 
                   message: 'Username is already taken. Please provide a different username.' 
               });
           }
           
           // Create new user with pending status
           await User.create({
               name: name || email.split('@')[0],
               username: usernameToUse,
               email: email,
               password: crypto.randomBytes(32).toString("hex"),
               role: role || 'user',
               invitation: 'pending',
               invitedBy: invitingUser._id.toString(),
               inviteToken: token,
               inviteTokenExpiry: tokenExpiry,
               status: 'pending'
           });
       }
     
       const result = await resend.emails.send({
        from: 'team@aictum.com',
        to: email,
        subject: `You're invited to Expense Tracker as ${role || 'user'}!`,
        html: `
          <div>
            <p>Hi there,</p>
            <p>You've been invited to join Expense Tracker${role ? ` as <b>${role}</b>` : ""} by ${invitingUser.name}.</p>
            <p>
              Click to accept and set your password: 
              <a href="${inviteUrl}">${inviteUrl}</a>
            </p>
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        `,
      });
  
        res.status(200).json({ 
            message: isResend ? 'Invitation resent successfully' : 'User invited successfully'
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to invite user', 
            error: error.message
        });
    }
}

//setup password
const setupPassword = async (req, res) => {
    try {
        const { password, token } = req.body;
        
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }
        
        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }
        
        // Find user by invite token
        const user = await User.findOne({ 
            inviteToken: token,
            inviteTokenExpiry: { $gt: new Date() } // Check if token is not expired
        });
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update user with new password and accept invitation
        user.password = hashedPassword;
        user.invitation = 'accepted';
      
        user.inviteToken = undefined; // Clear the token
        user.inviteTokenExpiry = undefined; // Clear the expiry
        await user.save();
        
        // Create a challenge id
        const challengeId = crypto.randomBytes(24).toString("hex");

        user.challengeId = challengeId;
        await user.save();
        res.status(200).json({ 
            message: 'Password setup successfully',
            challengeId: challengeId,
       
        });
    }
    catch (error) {
        res.status(500).json({ 
            message: 'Failed to setup password', 
            error: error.message 
        });
    }
}

//setup-mfa - Select MFA method and generate TOTP secret
const selectMfaMethod = async (req, res) => {
    try {
        const { challengeId, mfaMethod } = req.body;
        
        if (!challengeId) {
            return res.status(400).json({ message: 'Challenge ID is required' });
        }
        if (!mfaMethod) {
            return res.status(400).json({ message: 'MFA method is required' });
        }
        
        // Find user by challengeId
        const user = await User.findOne({ challengeId: challengeId });
        if (!user) {
            return res.status(401).json({ message: 'Invalid or expired challenge' });
        }
        
        // Validate MFA method
        if (mfaMethod !== "TOTP" && mfaMethod !== "PASSKEY") {
            return res.status(400).json({ message: 'Invalid MFA method. Use TOTP or PASSKEY' });
        }
        
        user.mfa_method = mfaMethod;
        
        // If TOTP is selected, generate secret and QR code
        if (mfaMethod === "TOTP") {
            // Generate a secret for TOTP
            const secret = speakeasy.generateSecret({
                name: `Expense Tracker (${user.email})`,
                issuer: 'Expense Tracker'
            });
            
            // Save the secret to user
            user.mfa_secret = secret.base32;
            
            // Generate new challenge ID for next step
            const newChallengeId = crypto.randomBytes(24).toString("hex");
            user.challengeId = newChallengeId;
            await user.save();
            
            // Generate QR code as data URL
            const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
            
            res.status(200).json({ 
                message: 'TOTP MFA setup initiated',
                challengeId: newChallengeId,
                secret: secret.base32, // Send the secret so user can manually enter if QR fails
                qrCode: qrCodeDataUrl, // Base64 QR code image
                otpAuthUrl: secret.otpauth_url // The URL that goes in the QR code
            });
        } else if (mfaMethod === "PASSKEY") {
            // Generate WebAuthn registration options
            const options = await generateRegistrationOptions({
                rpName: rpName,
                rpID: rpID,
                userID: user._id.toString(),
                userName: user.email,
                userDisplayName: user.name,
                attestationType: 'none',
                authenticatorSelection: {
                    residentKey: 'preferred',
                    userVerification: 'preferred',
                    authenticatorAttachment: 'platform' // For biometrics (fingerprint, face)
                }
            });
            
            // Store the challenge temporarily
            user.webauthn_challenge = options.challenge;
            await user.save();
            
            res.status(200).json({ 
                message: 'PASSKEY MFA setup initiated',
                challengeId: user.challengeId,
                options: options // Send registration options to frontend
            });
        }
    } catch (error) {
        console.error('MFA setup error:', error);
        res.status(500).json({ 
            message: 'Failed to setup MFA', 
            error: error.message 
        });
    }
}

//verify-mfa - Unified verification for both TOTP and PASSKEY
const verifyMfa = async (req, res) => {
    try {
        const { challengeId, totpCode, credential } = req.body;
        
        if (!challengeId) {
            return res.status(400).json({ message: 'Challenge ID is required' });
        }
        
        // Find user by challengeId
        const user = await User.findOne({ challengeId: challengeId });
        if (!user) {
            return res.status(401).json({ message: 'Invalid or expired challenge' });
        }
        
        if (!user.mfa_method) {
            return res.status(400).json({ message: 'MFA method not selected' });
        }
        
        let verified = false;
        let verificationMessage = '';
        
        // Handle TOTP verification
        if (user.mfa_method === 'TOTP') {
            if (!totpCode) {
                return res.status(400).json({ message: 'TOTP code is required' });
            }
            
            if (!user.mfa_secret) {
                return res.status(400).json({ message: 'MFA not setup for this user' });
            }
            
            // Verify the TOTP code
            verified = speakeasy.totp.verify({
                secret: user.mfa_secret,
                encoding: 'base32',
                token: totpCode,
                window: 2 // Allow 2 time steps before and after (60 seconds each)
            });
            
            verificationMessage = verified ? 
                'TOTP MFA verified and enabled successfully' : 
                'Invalid TOTP code. Please try again.';
        }
        
        // Handle PASSKEY verification
        else if (user.mfa_method === 'PASSKEY') {
            if (!credential) {
                return res.status(400).json({ message: 'Credential is required' });
            }
            
            if (!user.webauthn_challenge) {
                return res.status(400).json({ message: 'No WebAuthn challenge found' });
            }
            
            try {
                // Verify the registration response
                const verification = await verifyRegistrationResponse({
                    response: credential,
                    expectedChallenge: user.webauthn_challenge,
                    expectedOrigin: origin,
                    expectedRPID: rpID
                });
                
                if (verification.verified && verification.registrationInfo) {
                    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
                    
                    // Save the credential
                    const newCredential = {
                        credentialID: Buffer.from(credentialID).toString('base64'),
                        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
                        counter: counter,
                        createdAt: new Date()
                    };
                    
                    user.webauthn_credentials.push(newCredential);
                    user.webauthn_challenge = undefined; // Clear challenge
                    verified = true;
                    verificationMessage = 'Passkey verified and enabled successfully';
                } else {
                    verificationMessage = 'Passkey verification failed';
                }
            } catch (error) {
                console.error('Passkey verification error:', error);
                verificationMessage = 'Passkey verification failed: ' + error.message;
            }
        } else {
            return res.status(400).json({ 
                message: 'Invalid MFA method. Expected TOTP or PASSKEY' 
            });
        }
        
        // If verification successful, enable MFA and generate token
        if (verified) {
            user.mfa_enabled = true;
            user.status = 'active';
            user.challengeId = undefined; // Clear challenge ID after successful setup
            await user.save();
            
            // Generate JWT token for login
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            
            res.status(200).json({ 
                message: verificationMessage,
                token: token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                    mfa_enabled: true,
                    mfa_method: user.mfa_method
                }
            });
        } else {
            res.status(401).json({ 
                message: verificationMessage
            });
        }
    }
    catch (error) {
        console.error('MFA verification error:', error);
        res.status(500).json({ 
            message: 'Failed to verify MFA', 
            error: error.message 
        });
    }
}

// Verify MFA for user login
const verifyLoginMfa = async (req, res) => {
    try {
        const { challengeId, totpCode } = req.body;
        
        if (!challengeId) {
            return res.status(400).json({ message: 'Challenge ID is required' });
        }
        
        // Find user by challengeId
        const user = await User.findOne({ challengeId: challengeId });
        if (!user) {
            return res.status(401).json({ message: 'Invalid or expired challenge' });
        }
        
        if (!user.mfa_enabled) {
            return res.status(400).json({ message: 'MFA is not enabled for this user' });
        }
        
        if (!user.mfa_method) {
            return res.status(400).json({ message: 'MFA method not configured' });
        }
        
        let verified = false;
        
        // Handle TOTP verification
        if (user.mfa_method === 'TOTP') {
            if (!totpCode) {
                return res.status(400).json({ message: 'TOTP code is required' });
            }
            
            if (!user.mfa_secret) {
                return res.status(400).json({ message: 'MFA secret not found' });
            }
            
            // Verify the TOTP code
            verified = speakeasy.totp.verify({
                secret: user.mfa_secret,
                encoding: 'base32',
                token: totpCode,
                window: 2
            });
        } else {
            return res.status(400).json({ 
                message: 'Please use passkey authentication endpoints for PASSKEY MFA' 
            });
        }
        
        if (verified) {
            // Clear challengeId after successful verification
            user.challengeId = undefined;
            await user.save();
            
            // Generate JWT token
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            
            res.status(200).json({
                message: 'Login successful',
                token: token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    username: user.username,
                    role: user.role,
                    mfa_method: user.mfa_method
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid TOTP code. Please try again.' });
        }
    } catch (error) {
        console.error('Login MFA verification error:', error);
        res.status(500).json({
            message: 'Failed to verify MFA',
            error: error.message
        });
    }
}

// Generate authentication options for login with passkey
const generatePasskeyAuthOptions = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (!user.mfa_enabled || user.mfa_method !== 'PASSKEY') {
            return res.status(400).json({ message: 'Passkey not enabled for this user' });
        }
        
        // Get user's credentials
        const allowCredentials = user.webauthn_credentials.map(cred => ({
            id: Buffer.from(cred.credentialID, 'base64'),
            type: 'public-key',
            transports: ['internal', 'hybrid']
        }));
        
        // Generate authentication options
        const options = await generateAuthenticationOptions({
            rpID: rpID,
            allowCredentials: allowCredentials,
            userVerification: 'preferred'
        });
        
        // Store challenge temporarily
        user.webauthn_challenge = options.challenge;
        await user.save();
        
        res.status(200).json({
            message: 'Authentication options generated',
            options: options
        });
    } catch (error) {
        console.error('Generate auth options error:', error);
        res.status(500).json({
            message: 'Failed to generate authentication options',
            error: error.message
        });
    }
}

// Sign up admin - Register the first admin who can invite users
const signUpAdmin = async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        
        // Validate required fields
        if (!name || !username || !email || !password) {
            return res.status(400).json({ message: 'Name, username, email, and password are required' });
        }
        
        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        
        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: 'Username is already taken' });
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create a challenge id for MFA setup
        const challengeId = crypto.randomBytes(24).toString("hex");
        
        // Create the admin user
        const newAdmin = await User.create({
            name,
            username,
            email,
            password: hashedPassword,
            role: 'admin',
            invitation: 'accepted',
            status: 'pending',
            challengeId: challengeId
        });
        
        res.status(201).json({
            message: 'Admin registered successfully. Please setup MFA.',
            challengeId: challengeId,
            user: {
                id: newAdmin._id,
                name: newAdmin.name,
                username: newAdmin.username,
                email: newAdmin.email,
                role: newAdmin.role
            }
        });
    } catch (error) {
        console.error('Admin signup error:', error);
        res.status(500).json({
            message: 'Failed to register admin',
            error: error.message
        });
    }
}

// Verify authentication with passkey for login
const verifyPasskeyAuth = async (req, res) => {
    try {
        const { email, credential } = req.body;
        
        if (!email || !credential) {
            return res.status(400).json({ message: 'Email and credential are required' });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (!user.webauthn_challenge) {
            return res.status(400).json({ message: 'No authentication challenge found' });
        }
        
        // Find the matching credential
        const credentialID = Buffer.from(credential.id, 'base64url').toString('base64');
        const dbCredential = user.webauthn_credentials.find(
            cred => cred.credentialID === credentialID
        );
        
        if (!dbCredential) {
            return res.status(401).json({ message: 'Credential not found' });
        }
        
        // Verify the authentication response
        const verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge: user.webauthn_challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: Buffer.from(dbCredential.credentialID, 'base64'),
                credentialPublicKey: Buffer.from(dbCredential.credentialPublicKey, 'base64'),
                counter: dbCredential.counter
            }
        });
        
        if (verification.verified) {
            // Update counter
            const credIndex = user.webauthn_credentials.findIndex(
                cred => cred.credentialID === credentialID
            );
            user.webauthn_credentials[credIndex].counter = verification.authenticationInfo.newCounter;
            user.webauthn_challenge = undefined; // Clear challenge
            await user.save();
            
            // Generate JWT token
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            
            res.status(200).json({
                message: 'Authentication successful',
                token: token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    username: user.username
                }
            });
        } else {
            res.status(401).json({ message: 'Authentication failed' });
        }
    } catch (error) {
        console.error('Verify passkey auth error:', error);
        res.status(500).json({
            message: 'Failed to verify authentication',
            error: error.message
        });
    }
}

module.exports = { 
    getAllUsers, 
    getUserById, 
    loginUser, 
    inviteUser, 
    setupPassword, 
    selectMfaMethod, 
    verifyMfa,
    verifyLoginMfa,
    generatePasskeyAuthOptions,
    verifyPasskeyAuth,
    signUpAdmin
}