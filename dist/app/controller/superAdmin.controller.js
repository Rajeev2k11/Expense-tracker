const User = require("../models/users.models");
const { Resend } = require("resend");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const resend = new Resend(process.env.RESEND_API_KEY);

const createAdmin = async (req, res) => {
  try {
    // Check if request body exists
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        message:
          "Request body is required. Please ensure Content-Type is application/json.",
      });
    }

    const { name, username, email } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Get the inviting user (super admin) from auth middleware
    const invitingUser = await User.findById(req.userId);

    if (!invitingUser) {
      return res.status(401).json({ message: "Unauthorized" });
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
      if (existingUser.invitation === "accepted") {
        return res
          .status(400)
          .json({ message: "User has already accepted the invitation" });
      }

      // Update existing user with new invite token and set as ADMIN
      existingUser.inviteToken = token;
      existingUser.inviteTokenExpiry = tokenExpiry;
      existingUser.invitedBy = invitingUser._id.toString();
      existingUser.role = "ADMIN"; // Always set to ADMIN
      if (name) existingUser.name = name;
      if (username) existingUser.username = username;
      existingUser.status = "pending";
      existingUser.invitation = "pending";
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

      // Create new admin user with pending status
      await User.create({
        name: name || email.split("@")[0],
        username: usernameToUse,
        email: email,
        password: crypto.randomBytes(32).toString("hex"), // Temporary password
        role: "ADMIN", // Always set to ADMIN for super admin invites
        invitation: "pending",
        invitedBy: invitingUser._id.toString(),
        inviteToken: token,
        inviteTokenExpiry: tokenExpiry,
        status: "pending",
      });
    }

    // Send invitation email
    await resend.emails.send({
      from: "team@aictum.com",
      to: email,
      subject: "You're invited to Expense Tracker as Admin!",
      html: `
                <div>
                    <p>Hi there,</p>
                    <p>You've been invited to join Expense Tracker as <b>Admin</b> by ${invitingUser.name}.</p>
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
      message: isResend
        ? "Admin invitation resent successfully"
        : "Admin invited successfully",
      email: email,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create admin",
      error: error.message,
    });
  }
};

// Get all pending admin invitations
const getPendingAdminInvitations = async (req, res) => {
  try {
    // Get the requesting user (super admin) from auth middleware
    const requestingUser = await User.findById(req.userId);

    if (!requestingUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find all users with role ADMIN and invitation status 'pending'
    const pendingAdmins = await User.find({
      role: "ADMIN",
      invitation: "pending",
    })
      .select("-password -mfa_secret -webauthn_credentials")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Pending admin invitations retrieved successfully",
      count: pendingAdmins.length,
      data: pendingAdmins,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get pending admin invitations",
      error: error.message,
    });
  }
};

// Accept/Approve a pending admin invitation by super admin
const acceptPendingAdminInvitation = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get the requesting user (super admin) from auth middleware
    const superAdmin = await User.findById(req.userId);

    if (!superAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find the pending admin user (can be either 'pending' or 'accepted' invitation status)
    // If 'pending' - admin hasn't set password yet
    // If 'accepted' - admin has set password, waiting for super admin approval
    const pendingAdmin = await User.findOne({
      _id: userId,
      role: "ADMIN",
      invitation: { $in: ["pending", "accepted"] },
      status: { $in: ["pending", null] },
    });

    if (!pendingAdmin) {
      return res.status(404).json({
        message: "Pending admin invitation not found or already processed",
      });
    }

    // Check if admin has set their password
    // If invitation is 'accepted', they've set password
    // If invitation is 'pending' and token is expired, they need to set password first
    if (pendingAdmin.invitation === "pending") {
      if (
        !pendingAdmin.inviteToken ||
        !pendingAdmin.inviteTokenExpiry ||
        pendingAdmin.inviteTokenExpiry < new Date()
      ) {
        return res.status(400).json({
          message:
            "Invitation token is expired or invalid. Admin must set their password first or you need to resend the invitation.",
        });
      }
    }

    // Approve the invitation (change status from pending to active)
    // This makes the admin active and able to login (if they've set password)
    pendingAdmin.status = "active";
    // If invitation is still 'pending', keep it as pending until they set password
    // If invitation is 'accepted', it stays accepted
    await pendingAdmin.save();

    res.status(200).json({
      message: "Admin invitation approved successfully",
      user: {
        id: pendingAdmin._id,
        email: pendingAdmin.email,
        name: pendingAdmin.name,
        username: pendingAdmin.username,
        role: pendingAdmin.role,
        status: pendingAdmin.status,
        invitation: pendingAdmin.invitation,
        hasPasswordSet: pendingAdmin.invitation === "accepted",
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to accept pending admin invitation",
      error: error.message,
    });
  }
};

// Reject/Cancel a pending admin invitation
const rejectPendingAdminInvitation = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get the requesting user (super admin) from auth middleware
    const superAdmin = await User.findById(req.userId);

    if (!superAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find the pending admin user
    const pendingAdmin = await User.findOne({
      _id: userId,
      role: "ADMIN",
      invitation: "pending",
    });

    if (!pendingAdmin) {
      return res.status(404).json({
        message: "Pending admin invitation not found or already processed",
      });
    }

    // Reject the invitation
    pendingAdmin.invitation = "rejected";
    pendingAdmin.status = "inactive";
    pendingAdmin.inviteToken = undefined;
    pendingAdmin.inviteTokenExpiry = undefined;
    await pendingAdmin.save();

    res.status(200).json({
      message: "Admin invitation rejected successfully",
      user: {
        id: pendingAdmin._id,
        email: pendingAdmin.email,
        status: pendingAdmin.status,
        invitation: pendingAdmin.invitation,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to reject pending admin invitation",
      error: error.message,
    });
  }
};

// Get details of a specific pending admin invitation
const getPendingAdminInvitationById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get the requesting user (super admin) from auth middleware
    const requestingUser = await User.findById(req.userId);

    if (!requestingUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Find the pending admin user
    const pendingAdmin = await User.findOne({
      _id: userId,
      role: "ADMIN",
      invitation: "pending",
    }).select("-password -mfa_secret -webauthn_credentials");

    if (!pendingAdmin) {
      return res.status(404).json({
        message: "Pending admin invitation not found",
      });
    }

    // Get the inviting user details
    const invitedBy = await User.findById(pendingAdmin.invitedBy).select(
      "name email username",
    );

    res.status(200).json({
      message: "Pending admin invitation retrieved successfully",
      data: {
        ...pendingAdmin.toObject(),
        invitedBy: invitedBy || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get pending admin invitation",
      error: error.message,
    });
  }
};

// Create the first super admin (bootstrap endpoint - no auth required)
// This should only be used for initial setup
const createFirstSuperAdmin = async (req, res) => {
  try {
    const { name, username, email, password, secretKey } = req.body;

    // Validate required fields
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        message: "Name, username, email, and password are required",
      });
    }

    // Check if bootstrap secret key is provided and matches (extra security)
    const bootstrapSecret = process.env.BOOTSTRAP_SECRET_KEY;
    if (bootstrapSecret && secretKey !== bootstrapSecret) {
      return res.status(403).json({
        message: "Invalid bootstrap secret key",
      });
    }

    // Check if any super admin already exists
    // Super admin is identified by role 'ADMIN' (or we can add a separate super_admin field)
    const existingSuperAdmin = await User.findOne({
      role: "SUPER_ADMIN",
      status: "active",
    });

    if (existingSuperAdmin && !bootstrapSecret) {
      // If bootstrap secret is not set, prevent creating additional super admins
      return res.status(403).json({
        message:
          "Super admin already exists. Use authenticated endpoints to create more admins.",
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        message: "User with this email already exists",
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        message: "Username is already taken",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a challenge id for MFA setup
    const challengeId = crypto.randomBytes(24).toString("hex");

    // Create the super admin user
    const superAdmin = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      role: "SUPER_ADMIN", // Super admin has ADMIN role
      invitation: "accepted", // No invitation needed for first admin
      status: "active", // First super admin is active immediately
      challengeId: challengeId,
    });

    res.status(201).json({
      message: "First super admin created successfully. Please setup MFA.",
      challengeId: challengeId,
      user: {
        id: superAdmin._id,
        name: superAdmin.name,
        username: superAdmin.username,
        email: superAdmin.email,
        role: superAdmin.role,
        status: superAdmin.status,
      },
      note: "Use the challengeId to setup MFA before logging in.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create first super admin",
      error: error.message,
    });
  }
};

// Check if super admin exists (to know if bootstrap is needed)
const checkSuperAdminExists = async (req, res) => {
  try {
    const existingSuperAdmin = await User.findOne({
      role: "SUPER_ADMIN",
      status: "active",
    });

    res.status(200).json({
      exists: !!existingSuperAdmin,
      message: existingSuperAdmin
        ? "Super admin already exists"
        : "No super admin found. Bootstrap endpoint available.",
      requiresBootstrap: !existingSuperAdmin,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to check super admin status",
      error: error.message,
    });
  }
};

module.exports = {
  createAdmin,
  getPendingAdminInvitations,
  acceptPendingAdminInvitation,
  rejectPendingAdminInvitation,
  getPendingAdminInvitationById,
  createFirstSuperAdmin,
  checkSuperAdminExists,
};
