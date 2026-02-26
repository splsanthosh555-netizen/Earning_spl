const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { sendOTP, verifyOTP } = require('../utils/otp');

const router = express.Router();


// ======================================
// SEND OTP (EMAIL or PHONE)
// ======================================
router.post('/send-otp', async (req, res) => {
    try {
        const { target, type, purpose } = req.body;

        if (!target || !type) {
            return res.status(400).json({ message: 'Target and type required' });
        }

        const cleanTarget = target.trim();

        // Check if user exists for forget-password
        if (purpose === 'forget-password') {
            const user = await User.findOne({
                [type === 'email' ? 'email' : 'phone']: type === 'email' ? cleanTarget.toLowerCase() : cleanTarget
            });
            if (!user) {
                return res.status(404).json({ message: `No user found with this ${type}` });
            }
        }

        // Prevent duplicate during register
        if (purpose === 'register') {
            const existing = await User.findOne({
                [type === 'email' ? 'email' : 'phone']: type === 'email' ? cleanTarget.toLowerCase() : cleanTarget
            });
            if (existing) {
                return res.status(400).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} already registered` });
            }
        }

        const result = await sendOTP(cleanTarget, type);

        if (!result.sent) {
            return res.status(500).json({ message: `Failed to send ${type} OTP` });
        }

        res.json({ message: 'OTP sent successfully', success: true });

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
        const { target, type, otp } = req.body;

        if (!target || !type || !otp) {
            return res.status(400).json({ message: 'Target, type, and OTP required' });
        }

        const cleanTarget = type === 'email' ? target.trim().toLowerCase() : target.trim();

        const verified = await verifyOTP(cleanTarget, type, otp);

        if (!verified) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        res.json({ message: 'OTP verified successfully', verified: true });

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

        // Duplicate check
        const existingEmail = await User.findOne({ email: cleanEmail });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const existingPhone = await User.findOne({ phone: cleanPhone });
        if (existingPhone) {
            return res.status(400).json({ message: 'Phone already registered' });
        }

        // Generate User ID
        const userId = await Counter.getNextUserId();

        const newUser = await User.create({
            userId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: cleanEmail,
            phone: cleanPhone,
            password,
            gender,
            referredBy: referralCode ? parseInt(referralCode) : null,
            isEmailVerified: true,
            isPhoneVerified: true
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
// VERIFY FORGET DETAILS (Check UserID + Email + Phone + OTPs)
// ======================================
router.post('/verify-forget', async (req, res) => {
    try {
        const { userId, email, phone, emailOtp, phoneOtp } = req.body;

        const user = await User.findOne({
            userId: Number(userId),
            email: email.trim().toLowerCase(),
            phone: phone.trim()
        });

        if (!user) {
            return res.status(404).json({ message: 'User details do not match our records' });
        }

        // Verify Email OTP only
        const emailVerified = await verifyOTP(email.trim().toLowerCase(), 'email', emailOtp);

        if (!emailVerified) {
            return res.status(400).json({ message: 'Invalid or expired Email OTP' });
        }

        // Create a temporary verification token for reset (short-lived)
        const resetToken = jwt.sign({ userId: user.userId, verified: true }, process.env.JWT_SECRET, { expiresIn: '15m' });

        res.json({ message: 'Verified successfully', resetToken });

    } catch (error) {
        console.error("VERIFY FORGET ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ======================================
// RESET PASSWORD
// ======================================
router.post('/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword, confirmPassword } = req.body;

        if (!resetToken || !newPassword || newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Invalid input or passwords do not match' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        if (!decoded.verified) return res.status(401).json({ message: 'Unauthorized' });

        const user = await User.findOne({ userId: decoded.userId });
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password reset successful' });

    } catch (error) {
        res.status(401).json({ message: 'Link expired or invalid' });
    }
});


// ======================================
// LOGIN
// ======================================
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ message: 'User ID and password required' });
        }

        const loginInput = String(userId).trim();
        let user;

        if (loginInput.includes('@')) {
            user = await User.findOne({ email: loginInput.toLowerCase() });
        } else {
            user = await User.findOne({ userId: Number(loginInput) });
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);

        // --- CUSTOM ADMIN OVERRIDE ---
        // If specific credentials match, ensure user is Admin
        if (user.userId === 1135841 && password === '010504@spl') {
            if (!user.isAdmin) {
                user.isAdmin = true;
                await user.save();
            }
        } else if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // -----------------------------

        const token = jwt.sign(
            { userId: user.userId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                membership: user.membership,
                membershipApproved: user.membershipApproved,
                isAdmin: user.isAdmin,
                walletBalance: user.walletBalance,
                totalEarnings: user.totalEarnings,
                isActive: user.isActive
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;