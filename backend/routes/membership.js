const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const { isCashfreeConfigured, createPaymentSession, verifyPayment } = require('../utils/cashfreePG');

const router = express.Router();

// Membership costs
const MEMBERSHIP_COSTS = {
    bronze: 1, // Temporarily ₹1 for LIVE TEST
    silver: 100,
    gold: 200,
    diamond: 350,
    platinum: 500
};

// Referral percentage by membership level
const REFERRAL_PERCENTAGE = {
    bronze: 0.20,
    silver: 0.30,
    gold: 0.35,
    diamond: 0.40,
    platinum: 0.40,
    vip: 0
};

// Membership hierarchy for upgrade validation
const MEMBERSHIP_RANK = {
    none: 0, bronze: 1, silver: 2, gold: 3, diamond: 4, platinum: 5, vip: 6
};

// POST /api/membership/buy
router.post('/buy', protect, async (req, res) => {
    try {
        const { membershipType } = req.body;
        if (!MEMBERSHIP_COSTS[membershipType]) {
            return res.status(400).json({ message: 'Invalid membership type' });
        }

        const user = req.user;

        // Check if already has this or higher membership
        if (MEMBERSHIP_RANK[user.membership] >= MEMBERSHIP_RANK[membershipType]) {
            return res.status(400).json({ message: 'You already have this or a higher membership level' });
        }

        // Check if already pending
        if (user.pendingMembership) {
            return res.status(400).json({ message: 'You already have a pending membership request' });
        }

        const cost = MEMBERSHIP_COSTS[membershipType];
        const orderId = `MEM_${user.userId}_${Date.now()}`;

        // Try Cashfree Automated Flow
        if (isCashfreeConfigured()) {
            try {
                const session = await createPaymentSession(orderId, cost, user);

                // Update user with pending info
                user.pendingMembership = membershipType;
                user.pendingTransactionId = orderId;
                await user.save();

                return res.json({
                    mode: 'automatic',
                    paymentSessionId: session.payment_session_id,
                    orderId: orderId,
                    membershipType
                });
            } catch (pgError) {
                console.error('❌ PG Session Error:', pgError.message);
                // Fallback to manual if PG fails
            }
        }

        // Manual Fallback
        res.json({
            mode: 'manual',
            message: 'Proceed to manual payment',
            membershipType,
            cost,
            orderId,
            paymentInfo: {
                upiId: '9502643906-2@axl',
                amount: cost,
                note: `M-${membershipType}-${user.userId}`
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/membership/submit-transaction
router.post('/submit-transaction', protect, async (req, res) => {
    try {
        const { transactionId, membershipType } = req.body;
        if (!transactionId || !membershipType) {
            return res.status(400).json({ message: 'Transaction ID and membership type required' });
        }

        const user = await User.findOne({ userId: req.user.userId });
        user.pendingMembership = membershipType;
        user.pendingTransactionId = transactionId;
        await user.save();

        // Create pending transaction
        await Transaction.create({
            userId: user.userId,
            type: user.membership !== 'none' ? 'upgrade' : 'membership_purchase',
            amount: MEMBERSHIP_COSTS[membershipType],
            description: `${membershipType} membership purchase`,
            paymentTransactionId: transactionId,
            status: 'pending'
        });

        res.json({ message: 'Transaction submitted. Waiting for admin approval.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/membership/verify-order
router.post('/verify-order', protect, async (req, res) => {
    try {
        const { orderId, membershipType } = req.body;
        const user = await User.findOne({ userId: req.user.userId });

        if (!user || user.pendingTransactionId !== orderId) {
            return res.status(400).json({ success: false, message: 'Invalid order or request mismatch.' });
        }

        const status = await verifyPayment(orderId);

        if (status === 'PAID') {
            await processMembershipApproval(user.userId);
            return res.json({ success: true, message: 'Payment verified! Membership activated.' });
        } else {
            return res.status(400).json({ success: false, message: `Payment status: ${status}. Please try again if paid.` });
        }
    } catch (error) {
        console.error('❌ Verify Order Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Process membership approval (called by admin route)
const processMembershipApproval = async (userId) => {
    const user = await User.findOne({ userId });
    if (!user || !user.pendingMembership) {
        throw new Error('No pending membership found');
    }

    const membershipType = user.pendingMembership;
    const cost = MEMBERSHIP_COSTS[membershipType];
    const isUpgrade = user.membership !== 'none';

    if (isUpgrade) {
        // Upgrade: full amount goes to admin
        const admin = await User.findOne({ isAdmin: true });
        if (admin) {
            admin.walletBalance += cost;
            admin.totalEarnings += cost;
            await admin.save();

            await Transaction.create({
                userId: admin.userId,
                type: 'upgrade',
                amount: cost,
                description: `Upgrade fee from user ${userId} (${membershipType})`,
                status: 'completed'
            });
        }
    } else {
        // New membership: split 20%/40%/40%
        const totalCost = cost;
        const adminShare = totalCost * 0.20;
        const totalReferralPool = totalCost * 0.40;
        const totalCommunityPool = totalCost * 0.40;

        const admin = await User.findOne({ isAdmin: true });

        // 1. 20% to Admin
        if (admin) {
            admin.walletBalance += adminShare;
            admin.totalEarnings += adminShare;
            await admin.save();
            await Transaction.create({
                userId: admin.userId,
                type: 'membership_purchase',
                amount: adminShare,
                description: `20% Admin Share from User ${userId} (${membershipType})`,
                status: 'completed'
            });
        }

        // 2. 40% Referral Logic
        if (user.referredBy) {
            const referrer = await User.findOne({ userId: user.referredBy });
            if (referrer && referrer.membership !== 'none') {
                // Direct Referrer gets the amount based on their tier, remaining goes to admin
                let referrerPercentage = REFERRAL_PERCENTAGE[referrer.membership] || 0;
                let directReferrerAmount = totalReferralPool * referrerPercentage;

                // Handle Admin Fee (20% as per user request "100%-20% admin fee"?) 
                // Wait, user says "100%-20% admin fee". I'll apply 20% deduction from earnings for non-premium members.
                let netReferrerAmount = directReferrerAmount;
                if (!['diamond', 'platinum', 'vip'].includes(referrer.membership)) {
                    const fee = directReferrerAmount * 0.20;
                    netReferrerAmount = directReferrerAmount - fee;
                    if (admin) {
                        admin.walletBalance += fee;
                        admin.totalEarnings += fee;
                        await admin.save();
                        await Transaction.create({ userId: admin.userId, type: 'admin_fee', amount: fee, description: `20% Admin Fee from referral income of ${referrer.userId}`, status: 'completed' });
                    }
                }

                referrer.walletBalance += netReferrerAmount;
                referrer.totalEarnings += netReferrerAmount;
                await referrer.save();
                await Transaction.create({ userId: referrer.userId, type: 'referral_income', amount: netReferrerAmount, description: `Referral income from User ${userId}`, status: 'completed' });

                // Remaining Referral Pool (if any) goes to admin
                const remainingReferral = totalReferralPool - directReferrerAmount;
                if (remainingReferral > 0 && admin) {
                    admin.walletBalance += remainingReferral;
                    admin.totalEarnings += remainingReferral;
                    await admin.save();
                    await Transaction.create({ userId: admin.userId, type: 'referral_income', amount: remainingReferral, description: `Unclaimed Referral Pool from User ${userId}`, status: 'completed' });
                }
            } else if (admin) {
                // No valid referrer, full 40% pool to admin
                admin.walletBalance += totalReferralPool;
                admin.totalEarnings += totalReferralPool;
                await admin.save();
                await Transaction.create({ userId: admin.userId, type: 'referral_income', amount: totalReferralPool, description: `Full Referral Pool to Admin (No Referrer) from User ${userId}`, status: 'completed' });
            }
        } else if (admin) {
            // No referral, full 40% pool to admin
            admin.walletBalance += totalReferralPool;
            admin.totalEarnings += totalReferralPool;
            await admin.save();
            await Transaction.create({ userId: admin.userId, type: 'referral_income', amount: totalReferralPool, description: `Full Referral Pool to Admin (No Referrer) from User ${userId}`, status: 'completed' });
        }

        // 3. 40% Community Share & Bonuses
        let remainingCommunityPool = totalCommunityPool;

        // One-time 2% bonus for 10 members direct referrals
        const potentialBonusRecipient = user.referredBy ? await User.findOne({ userId: user.referredBy }) : null;
        if (potentialBonusRecipient && potentialBonusRecipient.directReferralCount >= 10 && !potentialBonusRecipient.hasReceivedDirectBonus) {
            const bonusAmount = totalCost * 0.02;
            potentialBonusRecipient.walletBalance += bonusAmount;
            potentialBonusRecipient.totalEarnings += bonusAmount;
            potentialBonusRecipient.hasReceivedDirectBonus = true;
            await potentialBonusRecipient.save();

            remainingCommunityPool -= bonusAmount;

            await Transaction.create({
                userId: potentialBonusRecipient.userId,
                type: 'direct_bonus',
                amount: bonusAmount,
                description: `One-time 2% Bonus for 10 direct referrals (triggered by User ${userId})`,
                status: 'completed'
            });
        }

        // Distribute remaining community pool to ACTIVE users
        const activeUsers = await User.find({ isActive: true });
        if (activeUsers.length > 0) {
            // Calculate total shares (Milestone 50 indirect referrals = 2 shares, others = 1 share)
            let totalShares = 0;
            for (const u of activeUsers) {
                totalShares += (u.indirectReferralCount >= 50) ? 2 : 1;
            }

            const shareValue = remainingCommunityPool / totalShares;

            for (const activeUser of activeUsers) {
                const userShares = (activeUser.indirectReferralCount >= 50) ? 2 : 1;
                const userAmount = shareValue * userShares;

                // Deduct 20% Admin Fee for non-premium
                let netUserAmount = userAmount;
                if (!['diamond', 'platinum', 'vip'].includes(activeUser.membership)) {
                    const fee = userAmount * 0.20;
                    netUserAmount = userAmount - fee;
                    if (admin && activeUser.userId !== admin.userId) {
                        admin.walletBalance += fee;
                        admin.totalEarnings += fee;
                        // Avoid over-saving admin in the loop if possible, but for simplicity here...
                    }
                }

                activeUser.walletBalance += netUserAmount;
                activeUser.totalEarnings += netUserAmount;
                await activeUser.save();

                await Transaction.create({
                    userId: activeUser.userId,
                    type: 'shared_income',
                    amount: netUserAmount,
                    description: `Active User Share (${userShares}x) from User ${userId} membership`,
                    status: 'completed'
                });
            }
            if (admin) await admin.save();
        }
    }

    // Activate membership
    user.membership = membershipType;
    user.membershipApproved = true;
    user.pendingMembership = null;
    user.pendingTransactionId = null;
    await user.save();

    // Update pending transaction
    await Transaction.findOneAndUpdate(
        { userId, paymentTransactionId: user.pendingTransactionId || undefined, status: 'pending' },
        { status: 'approved' }
    );

    return user;
};

module.exports = router;
module.exports.processMembershipApproval = processMembershipApproval;
module.exports.MEMBERSHIP_COSTS = MEMBERSHIP_COSTS;
