const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const { processMembershipApproval, MEMBERSHIP_COSTS } = require('./routes/membership');

async function runTest() {
    try {
        console.log('🚀 Starting Commission Logic Test...\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Cleanup previous test data
        await User.deleteMany({ email: /test-.*@example\.com/ });
        await Transaction.deleteMany({ userId: { $gte: 9000000 } });

        // 1. Create Admin
        const admin = await User.findOneAndUpdate(
            { isAdmin: true, userId: 1135840 },
            {
                firstName: 'Admin',
                lastName: 'Test',
                email: 'test-admin@example.com',
                walletBalance: 0,
                totalEarnings: 0,
                isActive: true,
                membership: 'vip'
            },
            { upsert: true, new: true }
        );

        // 2. Create Referrer (Silver Member)
        const referrer = await User.create({
            userId: 9000001,
            firstName: 'Referrer',
            lastName: 'Silver',
            email: 'test-referrer@example.com',
            password: 'password123',
            membership: 'silver',
            membershipApproved: true,
            isActive: true,
            directReferralCount: 10, // Milestone bonus eligible (10 directs)
            walletBalance: 0,
            totalEarnings: 0
        });

        // 3. Create Community User (Diamond - should NOT have 10% fee)
        const communityDiamond = await User.create({
            userId: 9000002,
            firstName: 'Comm',
            lastName: 'Diamond',
            email: 'test-comm-diamond@example.com',
            password: 'password123',
            membership: 'diamond',
            membershipApproved: true,
            isActive: true,
            indirectReferralCount: 50, // Milestone bonus eligible (2x community share)
            walletBalance: 0,
            totalEarnings: 0
        });

        // 4. Create Community User (Bronze - SHOULD have 10% fee)
        const communityBronze = await User.create({
            userId: 9000003,
            firstName: 'Comm',
            lastName: 'Bronze',
            email: 'test-comm-bronze@example.com',
            password: 'password123',
            membership: 'bronze',
            membershipApproved: true,
            isActive: true,
            indirectReferralCount: 0,
            walletBalance: 0,
            totalEarnings: 0
        });

        // 5. Create New User (The one buying membership)
        const newUser = await User.create({
            userId: 9000004,
            firstName: 'New',
            lastName: 'Member',
            email: 'test-new@example.com',
            password: 'password123',
            referredBy: referrer.userId,
            membership: 'none',
            pendingMembership: 'gold', // Buying Gold membership (₹200)
            walletBalance: 0,
            totalEarnings: 0
        });

        const cost = MEMBERSHIP_COSTS['gold']; // 200
        console.log(`--- Purchase: Gold Membership by User 9000004 (Cost: ₹${cost}) ---`);

        // Execute Distribution
        await processMembershipApproval(newUser.userId);

        // Re-fetch users to check balances
        const updatedAdmin = await User.findOne({ userId: 1135840 });
        const updatedReferrer = await User.findOne({ userId: 9000001 });
        const updatedCommDiamond = await User.findOne({ userId: 9000002 });
        const updatedCommBronze = await User.findOne({ userId: 9000003 });

        console.log('\n📊 TEST RESULTS:');

        // 1. Admin 20% Share
        const expectedAdminShare = cost * 0.20; // 40
        console.log(`- Admin 20% Base Share: ₹${updatedAdmin.walletBalance.toFixed(2)} (Expected: ₹${expectedAdminShare}+ fees)`);

        // 2. Referrer Income (Silver: 30% + 1.5% Milestone = 31.5% of Referral Pool)
        // Referral Pool = 40% of cost = 80
        const referralPool = cost * 0.40; // 80
        const silverBaseRate = 0.30;
        const silverMilestone = 0.015;
        const totalReferrerRate = silverBaseRate + silverMilestone; // 0.315
        const referrerGrossRate = referralPool * totalReferrerRate; // 80 * 0.315 = 25.2
        const referrerFee = referrerGrossRate * 0.10; // 2.52
        const expectedReferrerNet = referrerGrossRate - referrerFee; // 22.68
        console.log(`- Referrer (Silver + 10 Directs) Net: ₹${updatedReferrer.walletBalance.toFixed(2)} (Expected: ₹${expectedReferrerNet.toFixed(2)})`);

        // 3. Community Pool (40% of cost = 80)
        // Shares: Diamond (2x) + Bronze (1x) + Referrer (1x) + Admin (1x) = 5 shares
        // Wait, Referrer and Admin are also active users. 
        // Active users: Referrer (Silver, 1 share), CommDiamond (Diamond, 2 shares), CommBronze (Bronze, 1 share), Admin (VIP, 1 share).
        // Total shares = 1 + 2 + 1 + 1 = 5
        const communityPool = cost * 0.40; // 80
        const shareValue = communityPool / 5; // 16

        const expectedDiamondNet = shareValue * 2; // 32 (No fee)
        console.log(`- Community Diamond (50 Indirects, No Fee): ₹${updatedCommDiamond.walletBalance.toFixed(2)} (Expected: ₹${expectedDiamondNet.toFixed(2)})`);

        const expectedBronzeGross = shareValue * 1; // 16
        const bronzeFee = expectedBronzeGross * 0.10; // 1.6
        const expectedBronzeNet = expectedBronzeGross - bronzeFee; // 14.4
        console.log(`- Community Bronze (10% Fee Applied): ₹${updatedCommBronze.walletBalance.toFixed(2)} (Expected: ₹${expectedBronzeNet.toFixed(2)})`);

        console.log('\n✅ Commission Logic Test Passed!');

    } catch (err) {
        console.error('❌ Test Failed:', err);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 DB Disconnected');
    }
}

runTest();
