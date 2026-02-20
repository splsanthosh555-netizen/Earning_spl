const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { sendOTP, verifyOTP } = require('../utils/otp');

const router = express.Router();

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
            return res.status(400).json({
                message: `Failed to send real ${type}`,
                success: false
            });
        }

        res.json({
            message: `OTP sent to ${type}`,
            success: true
        });

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
            return res.status(400).json({
                message: 'Invalid or expired OTP'
            });
        }

        res.json({
            message: 'OTP verified successfully',
            verified: true
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;