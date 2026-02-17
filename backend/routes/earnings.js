const express = require('express');
const User = require('../models/User');
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
            canWithdraw: user.walletBalance >= 100
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
        if (user.walletBalance < amount) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
        }
        if (user.walletBalance < 100) {
            return res.status(400).json({ message: 'Wallet balance must be at least ₹100 to withdraw' });
        }

        // Create pending withdrawal
        await Transaction.create({
            userId: user.userId,
            type: 'withdrawal',
            amount,
            description: `Withdrawal request of ₹${amount}`,
            status: 'pending'
        });

        // Hold the amount
        user.walletBalance -= amount;
        await user.save();

        res.json({ message: 'Withdrawal request submitted. Waiting for admin approval.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
