const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { sendOTP, verifyOTP } = require('../utils/otp');

const router = express.Router();

// ======================
// SEND OTP
// ======================
router.post('/send-otp', async (req, res) => {
    try {
        const { target, type, purpose } = req.body;

        if (!target || !type) {
            return res.status(400).json({ message: 'Target and type required' });
        }

        if (type !== 'email' && type !== 'phone') {
            return res.status(400).json({ message: 'Type must be email or phone' });
        }

        // REGISTER CHECK
        if (purpose === 'register') {
            const query = type === 'email'
                ? { email: target.toLowerCase() }
                : { phone: target };

            const existing = await User.findOne(query);
            if (existing) {
                return res.status(400).json({
                    message: `${type} already registered`
                });
            }
        }

        const result = await sendOTP(target, type);

        if (!result.sent) {
            return res.status(500).json({
                message: `Failed to send ${type} OTP`
            });
        }

        res.json({
            message: `OTP sent to ${type}`,
            success: true
        });

    } catch (error) {
        console.error("SEND OTP ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ======================
// VERIFY OTP
// ======================
router.post('/verify-otp', async (req, res) => {
    try {
        const { target, type, otp } = req.body;

        if (!target || !type || !otp) {
            return res.status(400).json({
                message: 'Target, type and OTP required'
            });
        }

        const verified = await verifyOTP(target, type, otp);

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

module.exports = router;