const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const email = 'splsanthosh555@gmail.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.log('User not found');
            process.exit(1);
        }

        const txs = await Transaction.find({ userId: user.userId, type: 'withdrawal' });

        console.log('ACCOUNT_CHECK:', {
            userId: user.userId,
            walletBalance: user.walletBalance,
            totalEarnings: user.totalEarnings,
            canWithdraw: user.walletBalance >= 100,
            pendingWithdrawals: txs.length
        });

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
