const express = require('express');
const { sendOTP, verifyOTP } = require('../utils/otp');

const router = express.Router();

// ==============================
// SEND OTP
// ==============================
router.post('/send-otp', async (req, res) => {
    try {
        const { target, type } = req.body;

        if (!target || !type) {
            return res.status(400).json({
                message: 'Target and type are required'
            });
        }

        if (type !== 'email' && type !== 'phone') {
            return res.status(400).json({
                message: 'Type must be email or phone'
            });
        }

        const result = await sendOTP(target, type);

        if (!result.sent) {
            return res.status(400).json({
                message: `Failed to send real ${type}`,
                success: false
            });
        }

        return res.json({
            message: `OTP sent to ${type}`,
            success: true
        });

    } catch (error) {
        console.error('Send OTP Error:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
});

// ==============================
// VERIFY OTP
// ==============================
router.post('/verify-otp', async (req, res) => {
    try {
        const { target, type, otp } = req.body;

        if (!target || !type || !otp) {
            return res.status(400).json({
                message: 'Target, type and otp are required'
            });
        }

        const verified = await verifyOTP(target, type, otp);

        if (!verified) {
            return res.status(400).json({
                message: 'Invalid or expired OTP'
            });
        }

        return res.json({
            message: 'OTP verified successfully',
            verified: true
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
});

module.exports = router;
