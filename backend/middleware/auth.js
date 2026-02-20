const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { sendOTP, verifyOTP } = require('../utils/otp');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 🔥 SEND OTP
router.post('/send-otp', async (req, res) => {
    try {
        const { email, phone } = req.body;

        const emailOTP = generateOTP();
        const phoneOTP = generateOTP();

        const hashedEmailOTP = hashOTP(emailOTP);
        const hashedPhoneOTP = hashOTP(phoneOTP);

        const expiry = new Date(Date.now() + 5 * 60 * 1000);

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                email,
                phone
            });
        }

        user.emailOTP = hashedEmailOTP;
        user.phoneOTP = hashedPhoneOTP;
        user.emailOTPExpires = expiry;
        user.phoneOTPExpires = expiry;
        await user.save();

        await sendEmailOTP(email, emailOTP);
        await sendPhoneOTP(phone, phoneOTP);

        res.json({ message: 'OTP sent successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'OTP sending failed' });
    }
});

// 🔥 VERIFY OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, emailOTP, phoneOTP } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (
            user.emailOTPExpires < new Date() ||
            user.phoneOTPExpires < new Date()
        ) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        if (
            hashOTP(emailOTP) !== user.emailOTP ||
            hashOTP(phoneOTP) !== user.phoneOTP
        ) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        user.isEmailVerified = true;
        user.isPhoneVerified = true;
        user.emailOTP = undefined;
        user.phoneOTP = undefined;
        await user.save();

        const token = jwt.sign(
            { userId: user.userId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ message: 'Verification successful', token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Verification failed' });
    }
});

module.exports = router;