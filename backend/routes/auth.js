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

        if (!target || !type) {
            return res.status(400).json({ message: 'Target and type required' });
        }

        if (type !== 'email') {
            return res.status(400).json({ message: 'Only email OTP supported' });
        }

        // Check if already registered
        if (purpose === 'register') {
            const existing = await User.findOne({ email: target.toLowerCase() });
            if (existing) {
                return res.status(400).json({
                    message: 'Email already registered'
                });
            }
        }

        const result = await sendOTP(target, 'email');

        if (!result.sent) {
            return res.status(500).json({
                message: 'Failed to send email OTP'
            });
        }

        res.json({
            message: 'OTP sent to email',
            success: true
        });

    } catch (error) {
        console.error("SEND OTP ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


// ======================================
// VERIFY OTP (EMAIL ONLY)
// ======================================
router.post('/verify-otp', async (req, res) => {
    try {
        const { target, otp } = req.body;

        if (!target || !otp) {
            return res.status(400).json({
                message: 'Target and OTP required'
            });
        }

        const verified = await verifyOTP(target, 'email', otp);

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

        if (!firstName || !lastName || !email || !phone || !password || !gender) {
            return res.status(400).json({
                message: 'All required fields must be filled'
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

        // Check duplicates
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({ message: 'Phone already registered' });
        }

        // Generate auto userId
        const counter = await Counter.findOneAndUpdate(
            { name: 'userId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        // Create user
        const newUser = await User.create({
            userId: counter.seq,
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            password,
            gender,
            referralCode: referralCode || null
        });

        // Generate JWT
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


module.exports = router;