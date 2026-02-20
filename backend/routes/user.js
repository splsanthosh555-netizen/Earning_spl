const express = require('express');
const User = require('../models/User');
const BankDetails = require('../models/BankDetails');
const { protect } = require('../middleware/auth');

const router = express.Router();


// 🔹 GET /api/user/profile
router.get('/profile', protect, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findOne({ userId: req.user.userId }).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error("Profile Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


// 🔹 PUT /api/user/change-password
router.put('/change-password', protect, async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.findOne({ userId: req.user.userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await user.matchPassword(oldPassword);

        if (!isMatch) {
            return res.status(400).json({ message: 'Old password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


// 🔹 GET /api/user/bank-details
router.get('/bank-details', protect, async (req, res) => {
    try {
        const bankDetails = await BankDetails.findOne({ userId: req.user.userId });

        res.json(bankDetails || {});

    } catch (error) {
        console.error("Get Bank Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});


// 🔹 POST /api/user/bank-details
router.post('/bank-details', protect, async (req, res) => {
    try {
        const {
            bankName,
            accountHolderName,
            accountNumber,
            confirmAccountNumber,
            ifscCode,
            upiId
        } = req.body;

        if (!bankName || !accountHolderName || !accountNumber || !confirmAccountNumber || !ifscCode) {
            return res.status(400).json({ message: 'All required fields must be filled' });
        }

        if (accountNumber !== confirmAccountNumber) {
            return res.status(400).json({ message: 'Account numbers do not match' });
        }

        let bankDetails = await BankDetails.findOne({ userId: req.user.userId });

        if (bankDetails) {
            bankDetails.bankName = bankName;
            bankDetails.accountHolderName = accountHolderName;
            bankDetails.accountNumber = accountNumber;
            bankDetails.ifscCode = ifscCode;
            bankDetails.upiId = upiId;
            bankDetails.updatedAt = new Date();

            await bankDetails.save();

            return res.json({
                message: 'Bank details updated successfully',
                bankDetails
            });
        }

        bankDetails = await BankDetails.create({
            userId: req.user.userId,
            bankName,
            accountHolderName,
            accountNumber,
            ifscCode,
            upiId
        });

        res.status(201).json({
            message: 'Bank details saved successfully',
            bankDetails
        });

    } catch (error) {
        console.error("Save Bank Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;