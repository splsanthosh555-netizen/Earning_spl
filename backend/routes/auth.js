const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { sendOTP, verifyOTP } = require('../utils/otp');

const router = express.Router();

// Generate JWT
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// ==============================
// SEND OTP
// ==============================
router.post('/send-otp', async (req, res) => {
    try {
        const { target, type } = req.body;

        if (!target || !type) {
            return res.status(400).json({ message: 'Target and type required' });
        }

        const { sent } = await sendOTP(target, type);

        if (!sent) {
            return res.status(400).json({ message: 'Failed to send OTP' });
        }

        res.json({ message: `OTP sent to ${type}`, success: true });

    } catch (error) {
        console.error("Send OTP Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==============================
// VERIFY OTP
// ==============================
router.post('/verify-otp', async (req, res) => {
    try {
        const { target, type, otp } = req.body;

        const verified = await verifyOTP(target, type, otp);

        if (!verified) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        res.json({ message: 'OTP verified successfully', verified: true });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==============================
// REGISTER
// ==============================
router.post('/register', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            password,
            confirmPassword,
            gender
        } = req.body;

        if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !gender) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const userId = await Counter.getNextUserId();

        const user = await User.create({
            userId,
            firstName,
            lastName,
            email,
            phone,
            password,
            gender
        });

        res.status(201).json({
            message: 'Registration successful',
            userId: user.userId
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==============================
// LOGIN
// ==============================
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ message: 'User ID and password required' });
        }

        const user = await User.findOne({ userId: parseInt(userId) });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        res.json({
            token: generateToken(user.userId),
            user: {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                membership: user.membership,
                walletBalance: user.walletBalance
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;