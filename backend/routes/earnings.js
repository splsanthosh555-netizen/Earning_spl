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

        // REQUIREMENT: Membership active (not 'none')
        if (user.membership === 'none') {
            return res.status(400).json({ message: 'You must have an active membership to withdraw earnings.' });
        }

        if (!amount || amount < 100) {
            return res.status(400).json({ message: 'Minimum withdrawal amount is ₹100' });
        }

        if (user.walletBalance < amount) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
        }

        // Check if user has bank details
        const bankDetails = await BankDetails.findOne({ userId: req.user.userId });
        if (!bankDetails || (!bankDetails.accountNumber && !bankDetails.upiId)) {
            return res.status(400).json({ message: 'Please update your Bank/UPI details first' });
        }

        // Check if there is already a pending withdrawal
        const pendingWithdrawal = await Transaction.findOne({
            userId: user.userId,
            type: 'withdrawal',
            status: 'pending'
        });

        if (pendingWithdrawal) {
            return res.status(400).json({ message: 'You already have a pending withdrawal request. Please wait for admin approval.' });
        }

        // Limit: 3 withdrawals per day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const withdrawalCountToday = await Transaction.countDocuments({
            userId: user.userId,
            type: 'withdrawal',
            createdAt: { $gte: today, $lt: tomorrow }
        });

        if (withdrawalCountToday >= 3) {
            return res.status(400).json({ message: 'Daily limit reached. You can only request withdrawal 3 times per day.' });
        }

        // 1. Create pending withdrawal request
        await Transaction.create({
            userId: user.userId,
            type: 'withdrawal',
            amount,
            description: `Withdrawal to ${bankDetails.upiId || bankDetails.accountNumber}`,
            status: 'pending'
        });

        // NOTE: In this flow, balance is deducted on ADMIN APPROVAL.

        res.json({
            message: 'Withdrawal request submitted. Waiting for admin manual approval.',
            mode: 'manual'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
