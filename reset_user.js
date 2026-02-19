const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const User = require('./backend/models/User');
const Transaction = require('./backend/models/Transaction');

async function reset() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = 'splsanthosh555@gmail.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        console.log('Current State:', {
            userId: user.userId,
            walletBalance: user.walletBalance,
            totalEarnings: user.totalEarnings
        });

        // Delete the previous withdrawal transaction
        const deleted = await Transaction.deleteMany({
            userId: user.userId,
            type: 'withdrawal'
        });
        console.log(`Deleted ${deleted.deletedCount} withdrawal transactions`);

        // Reset wallet balance to match total earnings
        user.walletBalance = user.totalEarnings;
        await user.save();

        console.log('Updated State:', {
            userId: user.userId,
            walletBalance: user.walletBalance,
            totalEarnings: user.totalEarnings
        });

        await mongoose.disconnect();
        console.log('Reset complete!');
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

reset();
