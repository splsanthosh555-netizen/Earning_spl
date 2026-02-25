const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const setupCronJobs = () => {
    // Run at 00:01 every day
    cron.schedule('1 0 * * *', async () => {
        console.log('⏰ Running daily inactivity check...');
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            // Find users who haven't logged in for 30 days and are currently active
            const inactiveUsers = await User.find({
                lastActiveDate: { $lt: thirtyDaysAgo },
                isActive: true,
                isAdmin: false
            });

            if (inactiveUsers.length === 0) {
                console.log('✅ No inactive users found today.');
                return;
            }

            const admin = await User.findOne({ isAdmin: true });
            let count = 0;

            for (const user of inactiveUsers) {
                // If user has balance, transfer it to admin as per policy
                if (user.walletBalance > 0) {
                    const balance = user.walletBalance;

                    // 1. Transaction log for user
                    await Transaction.create({
                        userId: user.userId,
                        type: 'inactive_transfer',
                        amount: balance,
                        description: 'Wallet balance transferred to admin due to 30+ days inactivity',
                        status: 'completed',
                        isAuto: true
                    });

                    // 2. Add to admin wallet
                    if (admin) {
                        admin.walletBalance += balance;
                        admin.totalEarnings += balance;

                        // Transaction log for admin
                        await Transaction.create({
                            userId: admin.userId,
                            type: 'inactive_transfer',
                            amount: balance,
                            description: `Inactivity transfer from User ${user.userId}`,
                            status: 'completed',
                            isAuto: true
                        });
                    }

                    user.walletBalance = 0;
                }

                // Mark user as inactive
                user.isActive = false;
                await user.save();
                count++;
            }

            if (admin) await admin.save();
            console.log(`✅ Deactivated ${count} inactive users and processed wallet transfers.`);
        } catch (error) {
            console.error('❌ Daily Inactivity Job Failed:', error.message);
        }
    });

    console.log('🚀 Automated Cron Jobs Initialized (Daily Inactivity Check)');
};

module.exports = setupCronJobs;
