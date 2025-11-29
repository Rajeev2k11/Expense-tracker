const User = require('../models/users.models');
const bcrypt = require('bcrypt');
const { Resend } = require("resend");
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const resend = new Resend(process.env.RESEND_API_KEY);

const createUser = async (req, res) => {
    try {
        const { name,username, email, password, role } = req.body;
        
        // Check if user with email already exists
        const existingUser = await User.findOne({ email });
        if(existingUser){
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ 
            name,
            username, 
            email, 
            password: hashedPassword,
            role: role || 'user',
            invitation: 'pending',  // For direct registration, set as accepted
            invitedBy: existingUser  // For direct registration, user registers themselves
        });
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        //set token in cookies
        res.cookie('token', token, { httpOnly: true, secure: true, maxAge: 3600000 });
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ 
            message: 'User creation failed', 
            error: error.message 
        });
    }
}

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
        
        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.status(200).json({ 
            message: 'Login successful',
            token: token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to login', error: error.message });
    }
}
//invite user by sending email
const inviteUser = async (req, res) => {
    try {
       console.log('=== Invite User Started ===');
       console.log('Request body:', req.body);
       console.log('User ID from auth:', req.userId);
       
       const {email, role} = req.body;
       
       if (!email) {
           return res.status(400).json({ message: 'Email is required' });
       }
       
       // Get the inviting user from auth middleware
       const invitingUser = await User.findById(req.userId);
       console.log('Inviting user:', invitingUser ? invitingUser.email : 'NOT FOUND');
       
       if (!invitingUser) {
           return res.status(401).json({ message: 'Unauthorized' });
       }
       
       const token = crypto.randomBytes(24).toString("hex");
       const inviteUrl = `${process.env.FRONTEND_APP_URL}/set-password?token=${token}`;
       
       console.log('Preparing to send email...');
       console.log('From: onboarding@resend.dev');
       console.log('To:', email);
       console.log('Resend API Key present:', !!process.env.RESEND_API_KEY);
       console.log('Resend API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 5));

       // Send email using Resend
       const result = await resend.emails.send({
        from: 'team@aictum.com', // Resend's test email - replace with your verified domain
        to: email,
        subject: "You're invited to Expense Tracker!",
        html: `
          <div>
            <p>Hi there,</p>
            <p>You've been invited to join Expense Tracker${role ? ` as <b>${role}</b>` : ""} by ${invitingUser.name}.</p>
            <p>
              Click to accept and set your password: 
              <a href="${inviteUrl}">${inviteUrl}</a>
            </p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        `,
      });
      
      console.log('✅ Email sent successfully!');
      console.log('Resend Response:', JSON.stringify(result, null, 2));
  
        res.status(200).json({ 
            message: 'User invited successfully', 
            email: email,
            emailId: result.id,
            result: result
        });
    } catch (error) {
        console.error('❌ Failed to send invite email:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ 
            message: 'Failed to invite user', 
            error: error.message,
            errorDetails: error.toString()
        });
    }
}
module.exports = { createUser, getAllUsers, getUserById, loginUser ,inviteUser}