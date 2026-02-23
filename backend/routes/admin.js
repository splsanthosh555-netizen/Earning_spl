const express = require('express');
const User = require('../models/User');
const BankDetails = require('../models/BankDetails');
const Transaction = require('../models/Transaction');
const { protect, adminOnly } = require('../middleware/auth');
const { processMembershipApproval } = require('./membership');

const router = express.Router();

// GET /api/admin/dashboard
router.get('/dashboard', protect, adminOnly, async (req, res) => {
    console.log(`Admin dashboard accessed by: ${req.user.email} (isAdmin: ${req.user.isAdmin})`);
    try {
        const totalUsers = await User.countDocuments({ isAdmin: false });
        const activeUsers = await User.countDocuments({ isActive: true, isAdmin: false });
        const inactiveUsers = await User.countDocuments({ isActive: false, isAdmin: false });

        // Total revenue
        const adminUser = await User.findOne({ isAdmin: true });
        const totalRevenue = adminUser ? adminUser.totalEarnings : 0;

        // Monthly earnings
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthlyTransactions = await Transaction.aggregate([
            { $match: { createdAt: { $gte: startOfMonth }, type: { $nin: ['withdrawal'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const monthlyEarnings = monthlyTransactions.length > 0 ? monthlyTransactions[0].total : 0;

        // Weekly earnings
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const weeklyTransactions = await Transaction.aggregate([
            { $match: { createdAt: { $gte: startOfWeek }, type: { $nin: ['withdrawal'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const weeklyEarnings = weeklyTransactions.length > 0 ? weeklyTransactions[0].total : 0;

        res.json({
            totalUsers,
            activeUsers,
            inactiveUsers,
            totalRevenue,
            monthlyEarnings,
            weeklyEarnings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/users
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false })
            .select('-password')
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/active-users
router.get('/active-users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({ isActive: true, isAdmin: false })
            .select('userId firstName lastName membership');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/inactive-users
router.get('/inactive-users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({ isActive: false, isAdmin: false })
            .select('userId firstName lastName membership lastActiveDate');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/approvals
router.get('/approvals', protect, adminOnly, async (req, res) => {
    try {
        // Pending memberships
        const pendingMemberships = await User.find({ pendingMembership: { $ne: null } })
            .select('userId firstName lastName pendingMembership pendingTransactionId membership');

        // Pending withdrawals
        const pendingWithdrawals = await Transaction.find({ type: 'withdrawal', status: 'pending' })
            .sort({ createdAt: -1 });

        // Get user details for withdrawals
        const withdrawalDetails = await Promise.all(
            pendingWithdrawals.map(async (t) => {
                const user = await User.findOne({ userId: t.userId }).select('userId firstName lastName');
                const bankDetails = await BankDetails.findOne({ userId: t.userId });
                return { ...t.toObject(), user, bankDetails };
            })
        );

        res.json({ pendingMemberships, pendingWithdrawals: withdrawalDetails });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/admin/approve-membership
router.post('/approve-membership', protect, adminOnly, async (req, res) => {
    try {
        const { userId, action } = req.body; // action: 'approve' or 'reject'
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (action === 'approve') {
            await processMembershipApproval(userId);
            res.json({ message: `Membership approved for user ${userId}` });
        } else {
            // Reject
            await Transaction.findOneAndUpdate(
                { userId, status: 'pending', type: { $in: ['membership_purchase', 'upgrade'] } },
                { status: 'rejected' }
            );
            user.pendingMembership = null;
            user.pendingTransactionId = null;
            await user.save();
            res.json({ message: `Membership rejected for user ${userId}` });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/admin/approve-withdrawal
router.post('/approve-withdrawal', protect, adminOnly, async (req, res) => {
    try {
        const { transactionId, action, adminNote } = req.body;
        const AuditLog = require('../models/AuditLog');

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        // STRICT CHECK: Prevent double processing
        if (transaction.status !== 'pending') {
            return res.status(400).json({ message: `Transaction already processed (Current Status: ${transaction.status})` });
        }

        if (action === 'approve') {
            const user = await User.findOne({ userId: transaction.userId });
            const bankDetails = await BankDetails.findOne({ userId: transaction.userId });

            if (!user || !bankDetails) {
                return res.status(400).json({ message: 'User or Bank Details missing' });
            }

            // Handle Manual or Automatic Payout
            const { isCashfreeConfigured, createCashfreePayout } = require('../utils/cashfreePayout');
            const { mode } = req.body; // 'auto' or 'manual'

            let payoutId = 'MANUAL';

            if (mode === 'auto' && isCashfreeConfigured()) {
                try {
                    const payout = await createCashfreePayout(user, bankDetails, transaction.amount);
                    payoutId = payout.id;
                    transaction.description += ` (Auto Payout: ${payoutId})`;
                } catch (payoutError) {
                    const errorMsg = payoutError.response?.data?.message || payoutError.message;
                    console.error('❌ Payout Processing Error:', errorMsg);
                    return res.status(500).json({
                        message: `Automated payout failed: ${errorMsg}`,
                        error: errorMsg,
                        canManual: true
                    });
                }
            } else {
                transaction.description += ' (Manual Payout Verified)';
            }

            transaction.status = isCashfreeConfigured() ? 'completed' : 'approved';
            await transaction.save();

            // Log the action for strict auditing
            await AuditLog.create({
                adminId: req.user.userId,
                adminEmail: req.user.email,
                action: 'approve_withdrawal',
                targetId: transactionId,
                details: `Approved ₹${transaction.amount} for user ${transaction.userId}. PayoutID: ${payoutId}. Note: ${adminNote || 'None'}`,
                ipAddress: req.ip
            });

            return res.json({ message: 'Withdrawal approved successfully.', payoutId });
        } else {
            // Reject - refund amount back to user wallet
            transaction.status = 'rejected';
            transaction.description += ` (Rejected: ${adminNote || 'No reason provided'})`;
            await transaction.save();

            const user = await User.findOne({ userId: transaction.userId });
            if (user) {
                user.walletBalance += transaction.amount;
                await user.save();
            }

            // Log for auditing
            await AuditLog.create({
                adminId: req.user.userId,
                adminEmail: req.user.email,
                action: 'reject_withdrawal',
                targetId: transactionId,
                details: `Rejected ₹${transaction.amount} for user ${transaction.userId}. Reason: ${adminNote || 'None'}`,
                ipAddress: req.ip
            });

            res.json({ message: 'Withdrawal rejected and refunded.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/admin/lines
router.get('/lines', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false })
            .select('userId firstName lastName referredBy directReferralCount indirectReferralCount');

        const linesData = await Promise.all(
            users.map(async (user) => {
                const directReferrals = await User.find({ referredBy: user.userId })
                    .select('userId firstName lastName');
                return {
                    ...user.toObject(),
                    directReferrals
                };
            })
        );
        res.json(linesData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/admin/deactivate-inactive - run periodically to deactivate 30+ day inactive users
router.post('/deactivate-inactive', protect, adminOnly, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const inactiveUsers = await User.find({
            lastActiveDate: { $lt: thirtyDaysAgo },
            isActive: true,
            isAdmin: false
        });

        const admin = await User.findOne({ isAdmin: true });
        let totalTransferred = 0;

        for (const user of inactiveUsers) {
            if (user.walletBalance > 0) {
                totalTransferred += user.walletBalance;
                await Transaction.create({
                    userId: user.userId,
                    type: 'inactive_transfer',
                    amount: user.walletBalance,
                    description: `Inactive user wallet transfer to admin (30+ days inactive)`,
                    status: 'completed'
                });
                if (admin) {
                    admin.walletBalance += user.walletBalance;
                    admin.totalEarnings += user.walletBalance;
                }
                user.walletBalance = 0;
            }
            user.isActive = false;
            await user.save();
        }

        if (admin) await admin.save();

        res.json({
            message: `Deactivated ${inactiveUsers.length} users. ₹${totalTransferred} transferred to admin.`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/admin/reset-my-balance - TEMPORARY for testing withdrawal UI
router.post('/reset-my-balance', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Restore balance to total earnings (refund all withdrawals)
        user.walletBalance = user.totalEarnings;
        await user.save();

        // Delete all withdrawal transactions for this user
        await Transaction.deleteMany({ userId: user.userId, type: 'withdrawal' });

        res.json({
            message: 'Balance reset successful',
            walletBalance: user.walletBalance,
            totalEarnings: user.totalEarnings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
