const express = require('express');
const User = require('../models/User');
const BankDetails = require('../models/BankDetails');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/earnings/total
router.get('/total', protect, async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });
        res.json({
            totalEarnings: user.totalEarnings,
            walletBalance: user.walletBalance,
            // Bypass ₹100 check for Admin to allow testing withdrawal flow
            canWithdraw: user.isAdmin ? true : user.walletBalance >= 100
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/earnings/history
router.get('/history', protect, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/earnings/withdraw
router.post('/withdraw', protect, async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findOne({ userId: req.user.userId });

        if (!amount || amount < 100) {
            return res.status(400).json({ message: 'Minimum withdrawal amount is ₹100' });
        }

        // Only enforce balance check if NOT an admin (to allow testing)
        if (!user.isAdmin && user.walletBalance < amount) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
        }

        // Only enforce minimum balance if NOT an admin
        if (!user.isAdmin && user.walletBalance < 100) {
            return res.status(400).json({ message: 'Wallet balance must be at least ₹100 to withdraw' });
        }

        // Check if user has bank details
        const bankDetails = await BankDetails.findOne({ userId: req.user.userId });
        if (!bankDetails || (!bankDetails.accountNumber && !bankDetails.upiId)) {
            return res.status(400).json({ message: 'Please update your Bank/UPI details first' });
        }

        // Create pending withdrawal
        await Transaction.create({
            userId: user.userId,
            type: 'withdrawal',
            amount,
            description: `Withdrawal to ${bankDetails.upiId || bankDetails.accountNumber}`,
            status: 'pending'
        });

        // Hold the amount (only if balance is sufficient)
        if (user.walletBalance >= amount) {
            user.walletBalance -= amount;
            await user.save();
        }

        res.json({ message: 'Withdrawal request submitted. Waiting for admin approval.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
