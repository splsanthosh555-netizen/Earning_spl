const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { sendOTP, verifyOTP, isOTPVerified } = require('../utils/otp');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        const { target, type } = req.body;
        if (!target || !type) {
            return res.status(400).json({ message: 'Target and type required' });
        }
        const otp = await sendOTP(target, type);
        // In dev env, return OTP for testing convenience
        res.json({ message: `OTP sent to ${type}`, otp });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { target, type, otp } = req.body;
        const verified = await verifyOTP(target, type, otp);
        if (!verified) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }
        res.json({ message: 'OTP verified successfully', verified: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, confirmPassword, gender, referralCode } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !gender) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Check if email/phone OTPs verified
        const emailVerified = await isOTPVerified(email, 'email');
        const phoneVerified = await isOTPVerified(phone, 'phone');
        if (!emailVerified) {
            return res.status(400).json({ message: 'Please verify your email OTP first' });
        }
        if (!phoneVerified) {
            return res.status(400).json({ message: 'Please verify your phone number OTP first' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or phone already exists' });
        }

        // Validate referral code
        let referredBy = null;
        if (referralCode) {
            const referrer = await User.findOne({ userId: parseInt(referralCode) });
            if (!referrer) {
                return res.status(400).json({ message: 'Invalid referral code' });
            }
            referredBy = referrer.userId;
        }

        // Generate unique userId
        const userId = await Counter.getNextUserId();

        // Create user
        const user = await User.create({
            userId,
            firstName,
            lastName,
            email,
            phone,
            password,
            gender,
            referredBy
        });

        // Update referrer's direct referral count
        if (referredBy) {
            await User.findOneAndUpdate(
                { userId: referredBy },
                { $inc: { directReferralCount: 1 } }
            );
            // Update indirect referral counts up the chain
            const referrer = await User.findOne({ userId: referredBy });
            if (referrer && referrer.referredBy) {
                let uplineId = referrer.referredBy;
                while (uplineId) {
                    await User.findOneAndUpdate(
                        { userId: uplineId },
                        { $inc: { indirectReferralCount: 1 } }
                    );
                    const uplineUser = await User.findOne({ userId: uplineId });
                    uplineId = uplineUser ? uplineUser.referredBy : null;
                }
            }
        }

        res.status(201).json({
            message: 'Registration successful!',
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        if (!userId || !password) {
            return res.status(400).json({ message: 'User ID and password are required' });
        }

        let query = {};
        if (userId.includes('@')) {
            query = { email: userId.toLowerCase() };
        } else {
            query = { userId: parseInt(userId) };
        }

        const user = await User.findOne(query);
        if (!user) {
            return res.status(401).json({ message: 'User not found in system' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password does not match' });
        }

        // Update last active
        user.lastActiveDate = new Date();
        user.isActive = true;
        await user.save();

        res.json({
            token: generateToken(user.userId),
            user: {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                membership: user.membership,
                membershipApproved: user.membershipApproved,
                walletBalance: user.walletBalance,
                totalEarnings: user.totalEarnings,
                isAdmin: user.isAdmin,
                directReferralCount: user.directReferralCount,
                indirectReferralCount: user.indirectReferralCount,
                referredBy: user.referredBy,
                isActive: user.isActive
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { userId, email, phone } = req.body;
        if (!userId || !email || !phone) {
            return res.status(400).json({ message: 'User ID, email and phone are required' });
        }

        const user = await User.findOne({ userId: parseInt(userId), email, phone });
        if (!user) {
            return res.status(404).json({ message: 'No user found with these details' });
        }

        // Check if email and phone OTPs verified
        const emailVerified = await isOTPVerified(email, 'email');
        const phoneVerified = await isOTPVerified(phone, 'phone');
        if (!emailVerified || !phoneVerified) {
            return res.status(400).json({ message: 'Please verify both email and phone OTPs first' });
        }

        // Generate reset token
        const resetToken = jwt.sign({ userId: user.userId, reset: true }, process.env.JWT_SECRET, { expiresIn: '15m' });

        res.json({ message: 'Verification successful', resetToken });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword, confirmPassword } = req.body;
        if (!resetToken || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields required' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        if (!decoded.reset) {
            return res.status(400).json({ message: 'Invalid reset token' });
        }

        const user = await User.findOne({ userId: decoded.userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password reset successful! Please login with your new password.' });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
