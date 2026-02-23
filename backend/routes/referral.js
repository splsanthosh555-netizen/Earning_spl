const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/referral/link
router.get('/link', protect, async (req, res) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://earningspl.com';
        const referralLink = `${frontendUrl}/register?ref=${req.user.userId}`;
        res.json({
            userId: req.user.userId,
            referralLink,
            directReferralCount: req.user.directReferralCount,
            indirectReferralCount: req.user.indirectReferralCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/referral/direct
router.get('/direct', protect, async (req, res) => {
    try {
        const directReferrals = await User.find({ referredBy: req.user.userId })
            .select('userId firstName lastName membership isActive createdAt');
        res.json(directReferrals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/referral/indirect
router.get('/indirect', protect, async (req, res) => {
    try {
        // Get all direct referrals first
        const directReferrals = await User.find({ referredBy: req.user.userId }).select('userId');
        const directIds = directReferrals.map(u => u.userId);

        // Get all indirect referrals (referred by direct referrals, recursively)
        let indirectReferrals = [];
        let currentLevel = directIds;

        while (currentLevel.length > 0) {
            const nextLevel = await User.find({ referredBy: { $in: currentLevel } })
                .select('userId firstName lastName referredBy membership isActive createdAt');

            for (const user of nextLevel) {
                const upline = await User.findOne({ userId: user.referredBy }).select('firstName lastName userId');
                indirectReferrals.push({
                    userId: user.userId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    membership: user.membership,
                    isActive: user.isActive,
                    uplineId: user.referredBy,
                    uplineName: upline ? `${upline.firstName} ${upline.lastName}` : 'Unknown'
                });
            }
            currentLevel = nextLevel.map(u => u.userId);
        }

        res.json(indirectReferrals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
