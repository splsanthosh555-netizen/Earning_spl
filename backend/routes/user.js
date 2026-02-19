const express = require('express');
const User = require('../models/User');
const BankDetails = require('../models/BankDetails');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/user/profile
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId }).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/user/change-password
router.put('/change-password', protect, async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields required' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.findOne({ userId: req.user.userId });
        const isMatch = await user.matchPassword(oldPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Old password is incorrect' });
        }

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/user/bank-details
router.get('/bank-details', protect, async (req, res) => {
    try {
        const bankDetails = await BankDetails.findOne({ userId: req.user.userId });
        res.json(bankDetails || {});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/user/bank-details
router.post('/bank-details', protect, async (req, res) => {
    try {
        const { bankName, accountHolderName, accountNumber, confirmAccountNumber, ifscCode, upiId } = req.body;
        if (!bankName || !accountHolderName || !accountNumber || !confirmAccountNumber || !ifscCode) {
            return res.status(400).json({ message: 'All fields required' });
        }
        if (accountNumber !== confirmAccountNumber) {
            return res.status(400).json({ message: 'Account numbers do not match' });
        }

        const existing = await BankDetails.findOne({ userId: req.user.userId });
        if (existing) {
            existing.bankName = bankName;
            existing.accountHolderName = accountHolderName;
            existing.accountNumber = accountNumber;
            existing.ifscCode = ifscCode;
            existing.upiId = upiId; // Update UPI ID
            existing.updatedAt = new Date();
            await existing.save();
            return res.json({ message: 'Bank details updated', bankDetails: existing });
        }

        const bankDetails = await BankDetails.create({
            userId: req.user.userId,
            bankName,
            accountHolderName,
            accountNumber,
            ifscCode,
            upiId // Save UPI ID
        });
        res.status(201).json({ message: 'Bank details saved', bankDetails });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
