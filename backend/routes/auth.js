const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { sendOTP, verifyOTP } = require('../utils/otp');

const router = express.Router();


// ======================================
// SEND OTP (EMAIL ONLY)
// ======================================
router.post('/send-otp', async (req, res) => {
    try {
        const { target, type, purpose } = req.body;

        if (!target || type !== 'email') {
            return res.status(400).json({
                message: 'Valid email required'
            });
        }

        const cleanEmail = target.trim().toLowerCase();

        // Check if already registered
        if (purpose === 'register') {
            const existing = await User.findOne({ email: cleanEmail });
            if (existing) {
                return res.status(400).json({
                    message: 'Email already registered'
                });
            }
        }

        const result = await sendOTP(cleanEmail, 'email');

        if (!result.sent) {
            return res.status(500).json({
                message: 'Failed to send email OTP'
            });
        }

        res.json({
            message: 'OTP sent successfully',
            success: true
        });

    } catch (error) {
        console.error("SEND OTP ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


// ======================================
// VERIFY OTP
// ======================================
router.post('/verify-otp', async (req, res) => {
    try {
        const { target, otp } = req.body;

        if (!target || !otp) {
            return res.status(400).json({
                message: 'Email and OTP required'
            });
        }

        const cleanEmail = target.trim().toLowerCase();

        const verified = await verifyOTP(cleanEmail, 'email', otp);

        if (!verified) {
            return res.status(400).json({
                message: 'Invalid or expired OTP'
            });
        }

        res.json({
            message: 'OTP verified successfully',
            verified: true
        });

    } catch (error) {
        console.error("VERIFY OTP ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


// ======================================
// REGISTER USER
// ======================================
router.post('/register', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            password,
            confirmPassword,
            gender,
            referralCode
        } = req.body;

        if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !gender) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: 'Passwords do not match'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters'
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim();

        // Duplicate checks
        const existingEmail = await User.findOne({ email: cleanEmail });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const existingPhone = await User.findOne({ phone: cleanPhone });
        if (existingPhone) {
            return res.status(400).json({ message: 'Phone already registered' });
        }

        // ✅ CORRECT USER ID GENERATION
        const userId = await Counter.getNextUserId();

        const newUser = await User.create({
            userId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: cleanEmail,
            phone: cleanPhone,
            password,
            gender,
            referredBy: referralCode ? parseInt(referralCode) : null
        });

        const token = jwt.sign(
            { userId: newUser.userId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registration successful',
            userId: newUser.userId,
            token
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({
            message: 'Server error during registration'
        });
    }
});

// ======================================
// LOGIN
// ======================================
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({
                message: 'User ID and password required'
            });
        }

        let user;

        // Always convert to string first
        const loginInput = String(userId).trim();

        // Login by email
        if (loginInput.includes('@')) {
            user = await User.findOne({ email: loginInput.toLowerCase() });
        }
        // Login by userId number
        else {
            user = await User.findOne({ userId: Number(loginInput) });
        }

        if (!user) {
            console.log("❌ User not found");
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            console.log("❌ Password incorrect");
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            { userId: user.userId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log("✅ Login successful");

        res.json({
            token,
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
});