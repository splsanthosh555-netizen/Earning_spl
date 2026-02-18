const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Membership costs
const MEMBERSHIP_COSTS = {
    bronze: 50,
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

        // For upgrade, amount goes directly to admin
        const isUpgrade = user.membership !== 'none';

        res.json({
            message: 'Proceed to payment',
            membershipType,
            cost,
            isUpgrade,
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
        const adminShare = cost * 0.20;
        const referralShare = cost * 0.40;
        const communityShare = cost * 0.40;

        // 20% to admin
        const admin = await User.findOne({ isAdmin: true });
        if (admin) {
            admin.walletBalance += adminShare;
            admin.totalEarnings += adminShare;
            await admin.save();

            await Transaction.create({
                userId: admin.userId,
                type: 'membership_purchase',
                amount: adminShare,
                description: `20% admin share from user ${userId} membership`,
                status: 'completed'
            });
        }

        // 40% referral share
        if (user.referredBy) {
            const referrer = await User.findOne({ userId: user.referredBy });
            if (referrer && referrer.membership !== 'none') {
                let referrerPercentage = REFERRAL_PERCENTAGE[referrer.membership] || 0;

                // Bonus for 10+ direct referrals
                if (referrer.directReferralCount >= 10) {
                    if (referrer.membership === 'bronze') referrerPercentage += 0.02;
                    else if (referrer.membership === 'silver') referrerPercentage += 0.015;
                    else if (referrer.membership === 'gold') referrerPercentage += 0.01;
                }

                const referrerAmount = referralShare * referrerPercentage;
                const remainingReferral = referralShare - referrerAmount;

                // Deduct admin fee (10%) for non-diamond/platinum
                let netReferrerAmount = referrerAmount;
                if (!['diamond', 'platinum', 'vip'].includes(referrer.membership)) {
                    const adminFee = referrerAmount * 0.10;
                    netReferrerAmount = referrerAmount - adminFee;
                    if (admin) {
                        admin.walletBalance += adminFee;
                        admin.totalEarnings += adminFee;
                        await admin.save();
                        await Transaction.create({
                            userId: admin.userId,
                            type: 'admin_fee',
                            amount: adminFee,
                            description: `10% admin fee from referral income of user ${referrer.userId}`,
                            status: 'completed'
                        });
                    }
                }

                referrer.walletBalance += netReferrerAmount;
                referrer.totalEarnings += netReferrerAmount;
                await referrer.save();

                await Transaction.create({
                    userId: referrer.userId,
                    type: 'referral_income',
                    amount: netReferrerAmount,
                    description: `Referral income from user ${userId}`,
                    status: 'completed'
                });

                // Remaining referral amount to admin
                if (remainingReferral > 0 && admin) {
                    admin.walletBalance += remainingReferral;
                    admin.totalEarnings += remainingReferral;
                    await admin.save();
                    await Transaction.create({
                        userId: admin.userId,
                        type: 'referral_income',
                        amount: remainingReferral,
                        description: `Remaining referral share from user ${userId}`,
                        status: 'completed'
                    });
                }

                // Indirect referral income up the chain
                if (referrer.referredBy) {
                    let uplineId = referrer.referredBy;
                    while (uplineId) {
                        const uplineUser = await User.findOne({ userId: uplineId });
                        if (!uplineUser || uplineUser.membership === 'none') break;

                        let indirectPercentage = 0.01; // base 1%
                        if (['silver'].includes(uplineUser.membership)) indirectPercentage = 0.02;
                        if (['gold'].includes(uplineUser.membership)) indirectPercentage = 0.02;
                        if (['diamond'].includes(uplineUser.membership)) indirectPercentage = 0.10;
                        if (['platinum'].includes(uplineUser.membership)) indirectPercentage = 0.15;

                        // 50+ indirect referrals = 2x
                        if (uplineUser.indirectReferralCount >= 50) {
                            indirectPercentage *= 2;
                        }

                        const indirectAmount = referralShare * indirectPercentage;

                        // Admin fee for non-diamond/platinum
                        let netIndirect = indirectAmount;
                        if (!['diamond', 'platinum', 'vip'].includes(uplineUser.membership)) {
                            const fee = indirectAmount * 0.10;
                            netIndirect = indirectAmount - fee;
                            if (admin) {
                                admin.walletBalance += fee;
                                admin.totalEarnings += fee;
                                await admin.save();
                                await Transaction.create({
                                    userId: admin.userId,
                                    type: 'admin_fee',
                                    amount: fee,
                                    description: `10% admin fee from indirect income of user ${uplineUser.userId}`,
                                    status: 'completed'
                                });
                            }
                        }

                        uplineUser.walletBalance += netIndirect;
                        uplineUser.totalEarnings += netIndirect;
                        await uplineUser.save();

                        await Transaction.create({
                            userId: uplineUser.userId,
                            type: 'indirect_income',
                            amount: netIndirect,
                            description: `Indirect referral income from user ${userId}`,
                            status: 'completed'
                        });

                        uplineId = uplineUser.referredBy;
                    }
                }
            } else {
                // No valid referrer, referral share to admin
                if (admin) {
                    admin.walletBalance += referralShare;
                    admin.totalEarnings += referralShare;
                    await admin.save();
                    await Transaction.create({
                        userId: admin.userId,
                        type: 'referral_income',
                        amount: referralShare,
                        description: `Unclaimed referral share from user ${userId}`,
                        status: 'completed'
                    });
                }
            }
        } else {
            // No referrer, share goes to admin
            if (admin) {
                admin.walletBalance += referralShare;
                admin.totalEarnings += referralShare;
                await admin.save();
                await Transaction.create({
                    userId: admin.userId,
                    type: 'referral_income',
                    amount: referralShare,
                    description: `Unclaimed referral share from user ${userId}`,
                    status: 'completed'
                });
            }
        }

        // 40% community share - equal to all active users including admin
        const activeUsers = await User.find({ isActive: true });
        if (activeUsers.length > 0) {
            const sharePerUser = communityShare / activeUsers.length;
            for (const activeUser of activeUsers) {
                let netShare = sharePerUser;
                // Admin fee for non-diamond/platinum
                if (!['diamond', 'platinum', 'vip'].includes(activeUser.membership)) {
                    const fee = sharePerUser * 0.10;
                    netShare = sharePerUser - fee;
                    if (admin && activeUser.userId !== admin.userId) {
                        admin.walletBalance += fee;
                        admin.totalEarnings += fee;
                        await admin.save();
                        await Transaction.create({
                            userId: admin.userId,
                            type: 'admin_fee',
                            amount: fee,
                            description: `10% admin fee from shared income of user ${activeUser.userId}`,
                            status: 'completed'
                        });
                    }
                }
                activeUser.walletBalance += netShare;
                activeUser.totalEarnings += netShare;
                await activeUser.save();

                await Transaction.create({
                    userId: activeUser.userId,
                    type: 'shared_income',
                    amount: netShare,
                    description: `Community share from user ${userId} membership`,
                    status: 'completed'
                });
            }
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
