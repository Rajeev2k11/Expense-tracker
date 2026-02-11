const mongoose = require("mongoose");
const User = require("../models/users.models");
const Team = require("../models/team.model");
const bcrypt = require("bcrypt");
// const { Resend } = require("resend");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

// const resend = new Resend(process.env.RESEND_API_KEY);

// WebAuthn configuration
const rpName = "Expense Tracker";
// Ensure rpID is always a string - handle undefined/null cases
const rpID =
  process.env.RP_ID && typeof process.env.RP_ID === "string"
    ? process.env.RP_ID.trim()
    : "localhost"; // Your domain (e.g., 'example.com')
const origin =
  process.env.FRONTEND_APP_URL &&
  typeof process.env.FRONTEND_APP_URL === "string"
    ? process.env.FRONTEND_APP_URL.trim()
    : "http://localhost:5173";

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get users", error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get user", error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if user has a password set
    if (!user.password) {
      return res
        .status(401)
        .json({
          message: "Password not set. Please setup your password first.",
        });
    }

    // Compare password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Admin can login directly without MFA (if MFA is not enabled yet)
    // Check for both 'admin' (lowercase) and 'ADMIN' (uppercase) for backward compatibility
    if (user.role === "admin" || user.role === "ADMIN") {
      // If MFA is enabled, admin must use MFA flow
      if (user.mfa_enabled) {
        // Generate challengeId for MFA verification
        const challengeId = crypto.randomBytes(24).toString("hex");
        user.challengeId = challengeId;
        await user.save();

        // Return appropriate response based on MFA method
        const response = {
          message: "Password is correct. Please verify MFA.",
          mfa_method: user.mfa_method,
          challengeId: challengeId,
        };

        // Add guidance for PASSKEY MFA
        if (user.mfa_method === "PASSKEY") {
          response.note =
            "For PASSKEY MFA, use /api/v1/users/passkey-auth-options and /api/v1/users/passkey-auth-verify endpoints instead of verify-login-mfa";
        }

        return res.status(200).json(response);
      }

      // MFA not enabled - admin can login directly
      // Update status to active if pending
      if (user.status === "pending") {
        user.status = "active";
        await user.save();
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.status(200).json({
        message: "Login successful",
        token: token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
        },
      });
    }

    // Normal users need MFA verification
    if (!user.mfa_enabled) {
      return res
        .status(401)
        .json({ message: "MFA is not enabled. Please complete MFA setup." });
    }

    // Generate challengeId for MFA verification
    const challengeId = crypto.randomBytes(24).toString("hex");
    user.challengeId = challengeId;
    await user.save();

    // Return appropriate response based on MFA method
    const response = {
      message: "Password is correct. Please verify MFA.",
      mfa_method: user.mfa_method,
      challengeId: challengeId,
    };

    // Add guidance for PASSKEY MFA
    if (user.mfa_method === "PASSKEY") {
      response.note =
        "For PASSKEY MFA, use /api/v1/users/passkey-auth-options and /api/v1/users/passkey-auth-verify endpoints instead of verify-login-mfa";
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login", error: error.message });
  }
};
//invite user by sending email
const inviteUser = async (req, res) => {
  try {
    const { email, role, name, username } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Get the inviting user from auth middleware
    const invitingUser = await User.findById(req.userId);

    if (!invitingUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Generate invite token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    // const inviteUrl = `${process.env.FRONTEND_APP_URL}/set-password?token=${token}`;

    // Check if user already exists by email
    let existingUser = await User.findOne({ email });
    let isResend = false;

    if (existingUser) {
      // If user already accepted invitation, don't allow resend
      if (existingUser.invitation === "accepted") {
        return res
          .status(400)
          .json({ message: "User has already accepted the invitation" });
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
      const usernameToUse = username || email.split("@")[0];
      const existingUsername = await User.findOne({ username: usernameToUse });
      if (existingUsername) {
        return res.status(400).json({
          message:
            "Username is already taken. Please provide a different username.",
        });
      }

      // Create new user with pending status
      await User.create({
        name: name || email.split("@")[0],
        username: usernameToUse,
        email: email,
        password: crypto.randomBytes(32).toString("hex"),
        role: role || "user",
        invitation: "pending",
        invitedBy: invitingUser._id.toString(),
        inviteToken: token,
        inviteTokenExpiry: tokenExpiry,
        status: "pending",
      });
    }



    res.status(200).json({
      message: isResend
        ? "Invitation resent successfully"
        : "User invited successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to invite user",
      error: error.message,
    });
  }
};

//setup password
const setupPassword = async (req, res) => {
  try {
    const { password, token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Find user by invite token
    const user = await User.findOne({
      inviteToken: token,
      inviteTokenExpiry: { $gt: new Date() }, // Check if token is not expired
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user with new password and accept invitation
    user.password = hashedPassword;
    user.invitation = "accepted";

    user.inviteToken = undefined; // Clear the token
    user.inviteTokenExpiry = undefined; // Clear the expiry
    await user.save();

    // Create a challenge id
    const challengeId = crypto.randomBytes(24).toString("hex");

    user.challengeId = challengeId;
    await user.save();
    res.status(200).json({
      message: "Password setup successfully",
      challengeId: challengeId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to setup password",
      error: error.message,
    });
  }
};

//setup-mfa - Select MFA method and generate TOTP secret
const selectMfaMethod = async (req, res) => {
  try {
    const { challengeId, mfaMethod } = req.body;

    if (!challengeId) {
      return res.status(400).json({ message: "Challenge ID is required" });
    }
    if (!mfaMethod) {
      return res.status(400).json({ message: "MFA method is required" });
    }

    // Find user by challengeId
    const user = await User.findOne({ challengeId: challengeId });
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired challenge" });
    }

    // Validate MFA method
    if (mfaMethod !== "TOTP" && mfaMethod !== "PASSKEY") {
      return res
        .status(400)
        .json({ message: "Invalid MFA method. Use TOTP or PASSKEY" });
    }

    user.mfa_method = mfaMethod;

    // If TOTP is selected, generate secret and QR code
    if (mfaMethod === "TOTP") {
      // Generate a secret for TOTP
      const secret = speakeasy.generateSecret({
        name: `Expense Tracker (${user.email})`,
        issuer: "Expense Tracker",
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
        message: "TOTP MFA setup initiated",
        challengeId: newChallengeId,
        secret: secret.base32, // Send the secret so user can manually enter if QR fails
        qrCode: qrCodeDataUrl, // Base64 QR code image
        otpAuthUrl: secret.otpauth_url, // The URL that goes in the QR code
      });
    } else if (mfaMethod === "PASSKEY") {
      // Generate WebAuthn registration options
      const options = await generateRegistrationOptions({
        rpName: rpName,
        rpID: rpID,
        userID: Buffer.from(user._id.toString()),
        userName: user.email,
        userDisplayName: user.name,
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
          authenticatorAttachment: "platform", // For biometrics (fingerprint, face)
        },
      });

      // Store the challenge temporarily
      user.webauthn_challenge = options.challenge;
      await user.save();

      res.status(200).json({
        message: "PASSKEY MFA setup initiated",
        challengeId: user.challengeId,
        options: options, // Send registration options to frontend
      });
    }
  } catch (error) {
    console.error("MFA setup error:", error);
    res.status(500).json({
      message: "Failed to setup MFA",
      error: error.message,
    });
  }
};

// Verify MFA setup - handles both TOTP and PASSKEY verification (REGISTRATION/SETUP ONLY)
// This endpoint is used during initial MFA setup after password setup or admin registration
const verifyMfaSetup = async (req, res) => {
  try {
    const { challengeId, code, credential } = req.body;

    // Validate required fields
    if (!challengeId) {
      return res.status(400).json({ message: "Challenge ID is required" });
    }

    // Find user by challengeId
    const user = await User.findOne({ challengeId });
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired challenge" });
    }

    if (!user.mfa_method) {
      return res
        .status(400)
        .json({
          message: "MFA method not selected. Please select MFA method first.",
        });
    }

    let verified = false;
    let verificationMessage = "";

    // ========== TOTP Verification ==========
    if (user.mfa_method === "TOTP") {
      if (!code) {
        return res.status(400).json({ message: "TOTP code is required" });
      }

      if (!user.mfa_secret) {
        return res.status(400).json({ message: "MFA secret not found" });
      }

      // Verify the TOTP code
      verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: "base32",
        token: code,
        window: 2, // Allow 2 time steps before/after for clock drift
      });

      verificationMessage = verified
        ? "TOTP MFA verified and enabled successfully"
        : "Invalid TOTP code. Please try again.";
    }

    // ========== PASSKEY Verification ==========
    else if (user.mfa_method === "PASSKEY") {
      if (!credential) {
        return res
          .status(400)
          .json({ message: "Passkey credential is required" });
      }

      if (!user.webauthn_challenge) {
        return res
          .status(400)
          .json({
            message:
              "No WebAuthn challenge found. Please restart the setup process.",
          });
      }

      // Validate WebAuthn configuration
      if (!origin || !rpID) {
        console.error("WebAuthn configuration error:", { origin, rpID });
        return res
          .status(500)
          .json({
            message: "WebAuthn is not properly configured on the server",
          });
      }

      try {
        // Log the incoming credential for debugging
        console.log(
          "Received credential:",
          JSON.stringify(credential, null, 2),
        );
        console.log("Expected challenge:", user.webauthn_challenge);
        console.log("Expected origin:", origin);
        console.log("Expected RP ID:", rpID);

        // Verify the registration response using @simplewebauthn/server
        const verification = await verifyRegistrationResponse({
          response: credential,
          expectedChallenge: user.webauthn_challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          requireUserVerification: false,
        });

        console.log("Verification result:", {
          verified: verification.verified,
          hasRegistrationInfo: !!verification.registrationInfo,
          registrationInfoKeys: verification.registrationInfo
            ? Object.keys(verification.registrationInfo)
            : null,
          fullRegistrationInfo: verification.registrationInfo
            ? JSON.stringify(
                verification.registrationInfo,
                (key, value) => {
                  if (value instanceof Uint8Array || value instanceof Buffer) {
                    return `Buffer(${value.length} bytes)`;
                  }
                  return value;
                },
                2,
              )
            : null,
        });

        if (!verification.verified) {
          verified = false;
          verificationMessage =
            "Passkey verification failed - verification not verified";
          console.error(
            "Verification failed - verified:",
            verification.verified,
          );
          return res.status(400).json({ message: verificationMessage });
        }

        if (!verification.registrationInfo) {
          verified = false;
          verificationMessage =
            "Passkey verification failed - no registration info";
          console.error("Verification failed - no registrationInfo");
          return res.status(400).json({ message: verificationMessage });
        }

        // Log the full structure before destructuring
        console.log(
          "RegistrationInfo type:",
          typeof verification.registrationInfo,
        );
        console.log(
          "RegistrationInfo constructor:",
          verification.registrationInfo?.constructor?.name,
        );
        console.log(
          "RegistrationInfo keys:",
          Object.keys(verification.registrationInfo),
        );

        // Extract credential data from registrationInfo
        // In @simplewebauthn/server v13+, credential data is nested in the 'credential' property
        const registrationInfo = verification.registrationInfo;
        const registrationCredential = registrationInfo.credential;

        console.log("Registration credential object:", {
          hasCredential: !!registrationCredential,
          credentialType: registrationCredential
            ? typeof registrationCredential
            : "undefined",
          credentialKeys: registrationCredential
            ? Object.keys(registrationCredential)
            : null,
        });

        // Extract credentialID and credentialPublicKey from the credential object
        // credential.id might be a Buffer, Uint8Array, or base64url string
        let credentialID = registrationCredential?.id;
        let credentialPublicKey = registrationCredential?.publicKey;
        const counter = registrationInfo.counter || 0;

        // Handle case where credentialID might be a base64url string (from frontend)
        if (typeof credentialID === "string") {
          // Convert base64url to Buffer
          credentialID = Buffer.from(credentialID, "base64url");
        }

        // Log what we found
        console.log("Credential extraction:", {
          hasCredentialID: !!credentialID,
          credentialIDType: credentialID
            ? credentialID.constructor?.name
            : "undefined",
          credentialIDLength: credentialID
            ? credentialID.length || credentialID.byteLength || 0
            : 0,
          hasCredentialPublicKey: !!credentialPublicKey,
          credentialPublicKeyType: credentialPublicKey
            ? credentialPublicKey.constructor?.name
            : "undefined",
          credentialPublicKeyLength: credentialPublicKey
            ? credentialPublicKey.length || credentialPublicKey.byteLength || 0
            : 0,
          counter,
        });

        // Validate credential data
        if (!registrationCredential || !credentialID || !credentialPublicKey) {
          console.error("Missing credential data from verification");
          console.error(
            "Registration credential object:",
            registrationCredential,
          );
          console.error("CredentialID:", credentialID);
          console.error("CredentialPublicKey:", credentialPublicKey);
          console.error("Full registrationInfo structure:", {
            hasCredential: !!registrationCredential,
            credentialKeys: registrationCredential
              ? Object.keys(registrationCredential)
              : null,
            registrationInfoKeys: Object.keys(registrationInfo),
          });
          return res.status(400).json({
            message: "Incomplete credential data received",
            debug: {
              hasCredential: !!registrationCredential,
              hasCredentialID: !!credentialID,
              hasCredentialPublicKey: !!credentialPublicKey,
              credentialKeys: registrationCredential
                ? Object.keys(registrationCredential)
                : null,
              availableKeys: Object.keys(registrationInfo),
            },
          });
        }

        // Convert to Buffer if needed (handle Buffer, Uint8Array, and other ArrayLike objects)
        const credentialIDBuffer = Buffer.isBuffer(credentialID)
          ? credentialID
          : credentialID instanceof Uint8Array
            ? Buffer.from(credentialID)
            : Buffer.from(credentialID);

        const credentialPublicKeyBuffer = Buffer.isBuffer(credentialPublicKey)
          ? credentialPublicKey
          : credentialPublicKey instanceof Uint8Array
            ? Buffer.from(credentialPublicKey)
            : Buffer.from(credentialPublicKey);

        // Save the passkey credential
        const newCredential = {
          credentialID: credentialIDBuffer.toString("base64"),
          credentialPublicKey: credentialPublicKeyBuffer.toString("base64"),
          counter: counter || 0,
          createdAt: new Date(),
        };

        // Initialize credentials array if needed
        if (!Array.isArray(user.webauthn_credentials)) {
          user.webauthn_credentials = [];
        }

        user.webauthn_credentials.push(newCredential);
        user.webauthn_challenge = undefined; // Clear the challenge

        console.log("Passkey credential saved successfully");

        verified = true;
        verificationMessage = "Passkey verified and enabled successfully";
      } catch (error) {
        console.error("Passkey verification error:", error.message);

        // Provide detailed error messages
        let message = "Passkey verification failed";

        if (error.message.includes("challenge")) {
          message = "Challenge verification failed. Please try again.";
        } else if (error.message.includes("origin")) {
          message =
            "Origin mismatch. Please ensure you are on the correct domain.";
        } else if (
          error.message.includes("rpId") ||
          error.message.includes("RP ID")
        ) {
          message = "RP ID mismatch. Configuration error.";
        } else if (error.message) {
          message = `Passkey verification failed: ${error.message}`;
        }

        return res.status(400).json({ message });
      }
    }

    // ========== Invalid MFA Method ==========
    else {
      return res.status(400).json({
        message: "Invalid MFA method. Expected TOTP or PASSKEY",
      });
    }

    // ========== Handle Verification Result ==========
    if (verified) {
      // Enable MFA and activate user
      user.mfa_enabled = true;
      user.status = "active";
      user.challengeId = undefined; // Clear challenge after successful verification
      await user.save();

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.status(200).json({
        message: verificationMessage,
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
          mfa_enabled: true,
          mfa_method: user.mfa_method,
        },
      });
    } else {
      return res.status(401).json({ message: verificationMessage });
    }
  } catch (error) {
    console.error("MFA verification error:", error);
    return res.status(500).json({
      message: "Failed to verify MFA",
      error: error.message,
    });
  }
};

// ========== Helper: Verify TOTP ==========
// async function verifyTOTP(user, totpCode) {
//   if (!totpCode) {
//     throw new Error("TOTP code is required");
//   }

//   if (!user.mfa_secret) {
//     throw new Error("MFA not setup for this user");
//   }

//   return speakeasy.totp.verify({
//     secret: user.mfa_secret,
//     encoding: "base32",
//     token: totpCode,
//     window: 2,
//   });
// }

// Verify MFA for user login (authentication) - handles both TOTP and PASSKEY
const verifyLoginMfa = async (req, res) => {
  try {
    const { challengeId, totpCode, credential } = req.body;

    if (!challengeId) {
      return res.status(400).json({ message: "Challenge ID is required" });
    }

    // Find user by challengeId (from login)
    const user = await User.findOne({ challengeId: challengeId });
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired challenge" });
    }

    // This endpoint is for authentication (login), user must have MFA enabled
    if (!user.mfa_enabled) {
      return res
        .status(400)
        .json({ message: "MFA is not enabled for this user" });
    }

    if (!user.mfa_method) {
      return res.status(400).json({ message: "MFA method not configured" });
    }

    let verified = false;

    // Handle TOTP verification for login
    if (user.mfa_method === "TOTP") {
      if (!totpCode) {
        return res.status(400).json({ message: "TOTP code is required" });
      }

      if (!user.mfa_secret) {
        return res.status(400).json({ message: "MFA secret not found" });
      }

      // Verify the TOTP code
      verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: "base32",
        token: totpCode,
        window: 2,
      });

      if (!verified) {
        return res
          .status(401)
          .json({ message: "Invalid TOTP code. Please try again." });
      }
    }
    // Handle PASSKEY verification for login
    else if (user.mfa_method === "PASSKEY") {
      if (!credential) {
        return res
          .status(400)
          .json({ message: "Passkey credential is required" });
      }

      if (!user.webauthn_challenge) {
        return res.status(400).json({
          message:
            "No authentication challenge found. Please generate passkey auth options first.",
        });
      }

      if (
        !user.webauthn_credentials ||
        user.webauthn_credentials.length === 0
      ) {
        return res.status(400).json({
          message: "No passkey credentials found for this user",
        });
      }

      // Find the matching credential
      // The credential.id comes from browser as base64url string
      // We need to convert it to base64 to match what's stored in DB
      let credentialIDFromRequest;
      try {
        // Convert base64url to Buffer, then to base64 string
        const credentialIDBuffer = Buffer.from(credential.id, "base64url");
        credentialIDFromRequest = credentialIDBuffer.toString("base64");
      } catch (err) {
        console.error("Error converting credential ID:", err);
        return res.status(400).json({
          message: "Invalid credential ID format",
          error: err.message,
        });
      }

      // Try to find matching credential - compare both as base64 strings
      let dbCredential = user.webauthn_credentials.find(
        (cred) => cred && cred.credentialID === credentialIDFromRequest,
      );

      // If not found, try comparing as Buffers (in case of padding differences)
      if (!dbCredential) {
        try {
          const requestBuffer = Buffer.from(credential.id, "base64url");
          dbCredential = user.webauthn_credentials.find((cred) => {
            if (!cred || !cred.credentialID) return false;
            try {
              const dbBuffer = Buffer.from(cred.credentialID, "base64");
              return requestBuffer.equals(dbBuffer);
            } catch (error) {
              console.error("Error comparing credential IDs as buffers:", error);
              return false;
            }
          });
        } catch (err) {
          console.error("Error comparing credential IDs as buffers:", err);
        }
      }

      if (!dbCredential) {
        console.error(
          "Credential not found. Request credential ID (base64):",
          credentialIDFromRequest,
        );
        console.error(
          "Available credential IDs:",
          user.webauthn_credentials.map((c) => c?.credentialID),
        );
        return res.status(401).json({
          message: "Credential not found",
          debug: {
            receivedCredentialId: credentialIDFromRequest,
            availableCredentialCount: user.webauthn_credentials.length,
          },
        });
      }

      // Verify the authentication response (for login, not registration)
      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: user.webauthn_challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: Buffer.from(dbCredential.credentialID, "base64"),
          credentialPublicKey: Buffer.from(
            dbCredential.credentialPublicKey,
            "base64",
          ),
          counter: dbCredential.counter,
        },
      });

      if (!verification.verified) {
        return res
          .status(401)
          .json({ message: "Passkey authentication failed" });
      }

      verified = true;

      // Update counter - find the credential by comparing buffers
      const requestBuffer = Buffer.from(credential.id, "base64url");
      const credIndex = user.webauthn_credentials.findIndex((cred) => {
        if (!cred || !cred.credentialID) return false;
        try {
          const dbBuffer = Buffer.from(cred.credentialID, "base64");
          return requestBuffer.equals(dbBuffer);
        } catch (error) {
          console.error("Error comparing credential IDs as buffers:", error);
          return false;
        }
      });

      if (credIndex !== -1) {
        user.webauthn_credentials[credIndex].counter =
          verification.authenticationInfo.newCounter;
      }
    } else {
      return res.status(400).json({
        message: "Invalid or unsupported MFA method",
      });
    }

    // If verified, generate token and clear challenges
    if (verified) {
      // Clear challenges after successful verification
      user.challengeId = undefined;
      user.webauthn_challenge = undefined;
      await user.save();

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(200).json({
        message: "Login successful",
        token: token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
          mfa_method: user.mfa_method,
        },
      });
    }
  } catch (error) {
    console.error("Login MFA verification error:", error);
    res.status(500).json({
      message: "Failed to verify MFA",
      error: error.message,
    });
  }
};

// Generate authentication options for login with passkey
const generatePasskeyAuthOptions = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Validate WebAuthn configuration
    if (!rpID || typeof rpID !== "string") {
      console.error(
        "WebAuthn configuration error: rpID is not a valid string",
        { rpID, type: typeof rpID },
      );
      return res.status(500).json({
        message:
          "Server configuration error: WebAuthn RP_ID is not properly configured",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.mfa_enabled || user.mfa_method !== "PASSKEY") {
      return res
        .status(400)
        .json({ message: "Passkey not enabled for this user" });
    }

    if (!user.webauthn_credentials || user.webauthn_credentials.length === 0) {
      return res
        .status(400)
        .json({ message: "No passkey credentials found for this user" });
    }

    // Get user's credentials - properly convert credentialID from base64 string to Buffer
    const allowCredentials = user.webauthn_credentials
      .filter((cred) => cred && cred.credentialID) // Filter out invalid credentials
      .map((cred) => {
        try {
          // credentialID is stored as base64 string, convert to Buffer
          const credentialIDBuffer = Buffer.from(cred.credentialID, "base64");
          return {
            id: credentialIDBuffer,
            type: "public-key",
            transports: ["internal", "hybrid"],
          };
        } catch (err) {
          console.error("Error converting credentialID:", err, {
            credentialID: cred.credentialID,
          });
          return null;
        }
      })
      .filter((cred) => cred !== null); // Remove any failed conversions

    if (allowCredentials.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid passkey credentials found" });
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: rpID,
      allowCredentials: allowCredentials,
      userVerification: "preferred",
    });

    // Store challenge temporarily
    user.webauthn_challenge = options.challenge;
    await user.save();

    res.status(200).json({
      message: "Authentication options generated",
      options: options,
    });
  } catch (error) {
    console.error("Generate auth options error:", error);
    res.status(500).json({
      message: "Failed to generate authentication options",
      error: error.message,
    });
  }
};

// Sign up admin - Register the first admin who can invite users
const signUpAdmin = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    // Validate required fields
    if (!name || !username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, username, email, and password are required" });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username is already taken" });
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
      role: "admin",
      invitation: "accepted",
      status: "pending",
      challengeId: challengeId,
    });

    res.status(201).json({
      message: "Admin registered successfully. Please setup MFA.",
      challengeId: challengeId,
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error("Admin signup error:", error);
    res.status(500).json({
      message: "Failed to register admin",
      error: error.message,
    });
  }
};

// Verify authentication with passkey for login
const verifyPasskeyAuth = async (req, res) => {
  try {
    const { email, credential } = req.body;

    if (!email || !credential) {
      return res
        .status(400)
        .json({ message: "Email and credential are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.webauthn_challenge) {
      return res
        .status(400)
        .json({ message: "No authentication challenge found" });
    }

    // Find the matching credential
    const credentialID = Buffer.from(credential.id, "base64url").toString(
      "base64",
    );
    const dbCredential = user.webauthn_credentials.find(
      (cred) => cred.credentialID === credentialID,
    );

    if (!dbCredential) {
      return res.status(401).json({ message: "Credential not found" });
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: user.webauthn_challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(dbCredential.credentialID, "base64"),
        credentialPublicKey: Buffer.from(
          dbCredential.credentialPublicKey,
          "base64",
        ),
        counter: dbCredential.counter,
      },
    });

    if (verification.verified) {
      // Update counter
      const credIndex = user.webauthn_credentials.findIndex(
        (cred) => cred.credentialID === credentialID,
      );
      user.webauthn_credentials[credIndex].counter =
        verification.authenticationInfo.newCounter;
      user.webauthn_challenge = undefined; // Clear challenge
      await user.save();

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res.status(200).json({
        message: "Authentication successful",
        token: token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          username: user.username,
        },
      });
    } else {
      res.status(401).json({ message: "Authentication failed" });
    }
  } catch (error) {
    console.error("Verify passkey auth error:", error);
    res.status(500).json({
      message: "Failed to verify authentication",
      error: error.message,
    });
  }
};

const getEntityId = (entity) => {
  if (!entity) {
    return null;
  }

  if (entity._id) {
    return entity._id.toString();
  }

  if (typeof entity === "string") {
    return entity;
  }

  return entity.toString();
};

const mapTeamForResponse = (team) => ({
  id: team._id,
  name: team.name,
  description: team.description,
  team_leader: team.team_leader,
  members: team.members,
  monthly_budget: team.monthly_budget,
  monthly_budget_remaining: team.monthly_budget_remaining,
});

const isUserPartOfTeam = (team, userId) => {
  if (!team) {
    return false;
  }

  const leaderId = getEntityId(team.team_leader);
  if (leaderId === userId) {
    return true;
  }

  return (
    Array.isArray(team.members) &&
    team.members.some((member) => {
      const memberId = getEntityId(member);
      return memberId === userId;
    })
  );
};

const getTeamsForUser = async (userId) => {
  const teamsAsLeader = await Team.find({ team_leader: userId })
    .populate("team_leader", "name username email role")
    .populate("members", "name username email role");

  const teamsAsMember = await Team.find({ members: userId })
    .populate("team_leader", "name username email role")
    .populate("members", "name username email role");

  const teamMap = new Map();
  const addTeam = (team) => {
    const id = team._id.toString();
    if (!teamMap.has(id)) {
      teamMap.set(id, team);
    }
  };

  teamsAsLeader.forEach(addTeam);
  teamsAsMember.forEach(addTeam);

  return {
    teamsAsLeader,
    teamsAsMember,
    allTeams: Array.from(teamMap.values()),
  };
};

const getUserTeams = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("default_team active_team");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { allTeams } = await getTeamsForUser(userId);

    const defaultTeamId = user.default_team
      ? user.default_team.toString()
      : null;
    const defaultTeam = defaultTeamId
      ? allTeams.find((team) => team._id.toString() === defaultTeamId)
      : null;

    const activeTeamId = user.active_team ? user.active_team.toString() : null;
    const activeTeam = activeTeamId
      ? allTeams.find((team) => team._id.toString() === activeTeamId)
      : null;

    const resolvedActiveTeam = activeTeam || defaultTeam;

    return res.status(200).json({
      defaultTeamId,
      defaultTeam: defaultTeam ? mapTeamForResponse(defaultTeam) : null,
      activeTeamId,
      activeTeam: resolvedActiveTeam
        ? mapTeamForResponse(resolvedActiveTeam)
        : null,
      teams: allTeams.map(mapTeamForResponse),
    });
  } catch (error) {
    console.error("Get user teams error:", error);
    return res.status(500).json({
      message: "Failed to get user teams",
      error: error.message,
    });
  }
};

const setUserDefaultTeam = async (req, res) => {
  try {
    const userId = req.userId;
    const { teamId } = req.body || {};

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!teamId) {
      return res.status(400).json({ message: "Team ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const team = await Team.findById(teamId)
      .populate("team_leader", "name username email role")
      .populate("members", "name username email role");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (!isUserPartOfTeam(team, userId)) {
      return res
        .status(403)
        .json({
          message: "You must be a team member or leader to set it as default",
        });
    }

    user.default_team = team._id;
    await user.save();

    return res.status(200).json({
      message: "Default team updated successfully",
      defaultTeamId: user.default_team.toString(),
      defaultTeam: mapTeamForResponse(team),
    });
  } catch (error) {
    console.error("Set user default team error:", error);
    return res.status(500).json({
      message: "Failed to set default team",
      error: error.message,
    });
  }
};

const setUserActiveTeam = async (req, res) => {
  try {
    const userId = req.userId;
    const { teamId } = req.body || {};

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!teamId) {
      return res.status(400).json({ message: "Team ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: "Invalid team ID" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const team = await Team.findById(teamId)
      .populate("team_leader", "name username email role")
      .populate("members", "name username email role");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (!isUserPartOfTeam(team, userId)) {
      return res
        .status(403)
        .json({
          message: "You must be a team member or leader to set it as active",
        });
    }

    user.active_team = team._id;
    await user.save();

    return res.status(200).json({
      message: "Active team updated successfully",
      activeTeamId: user.active_team.toString(),
      activeTeam: mapTeamForResponse(team),
    });
  } catch (error) {
    console.error("Set user active team error:", error);
    return res.status(500).json({
      message: "Failed to set active team",
      error: error.message,
    });
  }
};

// Get current user profile with teams and role
const getCurrentUserProfile = async (req, res) => {
  try {
    // Get user ID from auth middleware
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find the user
    const user = await User.findById(userId).select(
      "-password -mfa_secret -webauthn_credentials",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { teamsAsLeader, teamsAsMember, allTeams } =
      await getTeamsForUser(userId);

    const defaultTeamId = user.default_team
      ? user.default_team.toString()
      : null;
    let defaultTeam = defaultTeamId
      ? allTeams.find((team) => team._id.toString() === defaultTeamId)
      : null;

    const activeTeamId = user.active_team ? user.active_team.toString() : null;
    let activeTeam = activeTeamId
      ? allTeams.find((team) => team._id.toString() === activeTeamId)
      : null;

    let shouldPersistUserUpdate = false;

    if (defaultTeamId && !defaultTeam) {
      user.default_team = null;
      shouldPersistUserUpdate = true;
    }

    if (activeTeamId && !activeTeam) {
      user.active_team = null;
      shouldPersistUserUpdate = true;
    }

    if (!defaultTeam) {
      if (teamsAsLeader.length > 0) {
        defaultTeam = teamsAsLeader[0];
      } else if (teamsAsMember.length > 0) {
        defaultTeam = teamsAsMember[0];
      }
    }

    if (!activeTeam) {
      activeTeam = defaultTeam;
    }

    if (shouldPersistUserUpdate) {
      await user.save({ validateBeforeSave: false });
    }

    // Active team: Uses persisted active team when available, otherwise falls back to default team

    // Format response
    const response = {
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        member_type: user.member_type,
      },
      defaultTeam: defaultTeam
        ? {
            id: defaultTeam._id,
            name: defaultTeam.name,
            description: defaultTeam.description,
            team_leader: defaultTeam.team_leader,
            members: defaultTeam.members,
            monthly_budget: defaultTeam.monthly_budget,
            monthly_budget_remaining: defaultTeam.monthly_budget_remaining,
          }
        : null,
      activeTeam: activeTeam
        ? {
            id: activeTeam._id,
            name: activeTeam.name,
            description: activeTeam.description,
            team_leader: activeTeam.team_leader,
            members: activeTeam.members,
            monthly_budget: activeTeam.monthly_budget,
            monthly_budget_remaining: activeTeam.monthly_budget_remaining,
          }
        : null,
      allTeams: allTeams.map(mapTeamForResponse),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Get current user profile error:", error);
    res.status(500).json({
      message: "Failed to get user profile",
      error: error.message,
    });
  }
};

module.exports = {
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
  getCurrentUserProfile,
};
