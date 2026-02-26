const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const { isCashfreeConfigured, createPaymentSession, verifyPayment } = require('../utils/cashfreePG');
const { isPhonePeConfigured, initiatePhonePePayment, verifyPhonePePayment } = require('../utils/phonepePG');

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

        console.log(`[PURCHASE] Start: User ${user.userId}, Plan: ${membershipType}, Cost: ${cost}`);

        // 1. Try PhonePe First (User Preference)
        if (isPhonePeConfigured()) {
            try {
                const phonepeRes = await initiatePhonePePayment(orderId, cost, user.userId);

                // Save pending info
                user.pendingMembership = membershipType;
                user.pendingTransactionId = orderId;
                await user.save();

                return res.json({
                    mode: 'phonepe',
                    redirectUrl: phonepeRes.url,
                    orderId: orderId,
                    membershipType
                });
            } catch (phonepeError) {
                console.error('❌ [PURCHASE] PhonePe Error:', phonepeError.message);
                // Fall through to Cashfree or Manual
            }
        }

        // 2. Try Cashfree Automated Flow
        const pgConfigured = isCashfreeConfigured();
        console.log(`[PURCHASE] PG (Cashfree) Configured: ${pgConfigured}`);

        if (pgConfigured) {
            try {
                const session = await createPaymentSession(orderId, cost, user);
                console.log(`[PURCHASE] Session Created: ${session.payment_session_id}`);

                // Save pending info
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
                console.error('❌ [PURCHASE] PG Error, falling back to manual:', pgError.message);
                // Fall through to manual below
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
        const { orderId } = req.body;
        const user = await User.findOne({ userId: req.user.userId });

        if (!user || user.pendingTransactionId !== orderId) {
            return res.status(400).json({ success: false, message: 'Invalid order or request mismatch.' });
        }

        let status = 'PENDING';

        // Check PhonePe status if configured
        if (isPhonePeConfigured()) {
            status = await verifyPhonePePayment(orderId);
        } else {
            // Default to Cashfree
            status = await verifyPayment(orderId);
        }

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

/**
 * PhonePe Server-to-Server Callback
 * Always ensure your backend server exposes this publicly
 */
router.post('/phonepe-callback', async (req, res) => {
    try {
        const { response } = req.body;
        const decoded = JSON.parse(Buffer.from(response, 'base64').toString('utf-8'));

        console.log('[PHONEPE CALLBACK] Decoded:', decoded);

        if (decoded.success && decoded.code === 'PAYMENT_SUCCESS') {
            const orderId = decoded.data.merchantTransactionId;
            const amount = decoded.data.amount / 100;
            const phonepeTxnId = decoded.data.transactionId;

            // Find user by orderId
            const user = await User.findOne({ pendingTransactionId: orderId });
            if (user && user.membershipApproved === false) {
                console.log(`[PHONEPE CALLBACK] Auto-approving membership for User ${user.userId}`);
                await processMembershipApproval(user.userId);
            }
        }

        // PhonePe expects 200 OK
        res.status(200).send('OK');
    } catch (error) {
        console.error('[PHONEPE CALLBACK] Error:', error.message);
        res.status(500).send('ERROR');
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

        const admin = await User.findOne({ isAdmin: true, userId: '1135841' }); // Specific Master Admin

        // 1. 20% to Admin (Life time fixed)
        if (admin) {
            admin.walletBalance += adminShare;
            admin.totalEarnings += adminShare;
            await admin.save();
            await Transaction.create({
                userId: admin.userId,
                type: 'membership_purchase',
                amount: adminShare,
                description: `20% Fixed Admin Share from User ${userId} (${membershipType})`,
                status: 'completed',
                isAuto: true
            });
        }

        // 2. 40% Referral Logic (Tiered + Milestone Bonus)
        if (user.referredBy) {
            const referrer = await User.findOne({ userId: user.referredBy });
            if (referrer && referrer.membership !== 'none') {
                // Determine Referral Percentage based on Tier
                let basePercent = 0.20; // Bronze
                if (referrer.membership === 'silver') basePercent = 0.30;
                if (referrer.membership === 'gold') basePercent = 0.35;
                if (['diamond', 'platinum', 'vip'].includes(referrer.membership)) basePercent = 0.40;

                // Milestone Bonus: 10 Direct Referrals
                if (referrer.directReferralCount >= 10) {
                    if (referrer.membership === 'bronze') basePercent += 0.02;
                    else if (referrer.membership === 'silver') basePercent += 0.015;
                    else if (referrer.membership === 'gold') basePercent += 0.01;
                }

                const referrerAmount = totalReferralPool * basePercent;

                // Deduct 10% Admin Fee (Excluding Diamond/Platinum/VIP)
                let netReferrerAmount = referrerAmount;
                if (!['diamond', 'platinum', 'vip'].includes(referrer.membership)) {
                    const fee = referrerAmount * 0.10; // New 10% rule
                    netReferrerAmount = referrerAmount - fee;
                    if (admin && referrer.userId !== admin.userId) {
                        admin.walletBalance += fee;
                        admin.totalEarnings += fee;
                        await admin.save();
                        await Transaction.create({ userId: admin.userId, type: 'admin_fee', amount: fee, description: `10% Admin Fee from referral income of ${referrer.userId}`, status: 'completed', isAuto: true });
                    }
                }

                referrer.walletBalance += netReferrerAmount;
                referrer.totalEarnings += netReferrerAmount;
                await referrer.save();
                await Transaction.create({ userId: referrer.userId, type: 'referral_income', amount: netReferrerAmount, description: `Referral income from User ${userId}`, status: 'completed', isAuto: true });

                // Remaining Referral Pool goes to admin
                const remainingReferral = totalReferralPool - referrerAmount;
                if (remainingReferral > 0 && admin) {
                    admin.walletBalance += remainingReferral;
                    admin.totalEarnings += remainingReferral;
                    await admin.save();
                    await Transaction.create({ userId: admin.userId, type: 'referral_income', amount: remainingReferral, description: `Unclaimed Referral Pool from User ${userId}`, status: 'completed', isAuto: true });
                }
            } else if (admin) {
                // No valid referrer, full 40% pool to admin
                admin.walletBalance += totalReferralPool;
                admin.totalEarnings += totalReferralPool;
                await admin.save();
                await Transaction.create({ userId: admin.userId, type: 'referral_income', amount: totalReferralPool, description: `Full Referral Pool to Admin (No Referrer) from User ${userId}`, status: 'completed', isAuto: true });
            }
        } else if (admin) {
            // No referredBy, full 40% pool to admin
            admin.walletBalance += totalReferralPool;
            admin.totalEarnings += totalReferralPool;
            await admin.save();
            await Transaction.create({ userId: admin.userId, type: 'referral_income', amount: totalReferralPool, description: `Full Referral Pool to Admin (No Referrer) from User ${userId}`, status: 'completed', isAuto: true });
        }

        // 3. 40% Community Share (Equal parts to all active users)
        const activeUsers = await User.find({ isActive: true, membership: { $ne: 'none' } });
        if (activeUsers.length > 0) {
            // Milestone: 50 Indirect Referrals = 2x Amount
            let totalShares = 0;
            for (const u of activeUsers) {
                totalShares += (u.indirectReferralCount >= 50) ? 2 : 1;
            }

            const shareValue = totalCommunityPool / totalShares;

            for (const activeUser of activeUsers) {
                const userShares = (activeUser.indirectReferralCount >= 50) ? 2 : 1;
                const userAmount = shareValue * userShares;

                // Deduct 10% Admin Fee (Excluding Diamond/Platinum/VIP)
                let netUserAmount = userAmount;
                if (!['diamond', 'platinum', 'vip'].includes(activeUser.membership)) {
                    const fee = userAmount * 0.10;
                    netUserAmount = userAmount - fee;
                    if (admin && activeUser.userId !== admin.userId) {
                        admin.walletBalance += fee;
                        admin.totalEarnings += fee;
                    }
                }

                activeUser.walletBalance += netUserAmount;
                activeUser.totalEarnings += netUserAmount;
                await activeUser.save();

                await Transaction.create({
                    userId: activeUser.userId,
                    type: 'shared_income',
                    amount: netUserAmount,
                    description: `Active Community Share (${userShares}x) from membership purchase`,
                    status: 'completed',
                    isAuto: true
                });
            }
            if (admin) await admin.save();
        } else if (admin) {
            // No other active users, pool goes to admin
            admin.walletBalance += totalCommunityPool;
            admin.totalEarnings += totalCommunityPool;
            await admin.save();
            await Transaction.create({ userId: admin.userId, type: 'shared_income', amount: totalCommunityPool, description: `Community Pool to Admin (No other active users)`, status: 'completed', isAuto: true });
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
