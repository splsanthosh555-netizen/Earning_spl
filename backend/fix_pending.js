const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const User = require('./models/User');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const result = await User.updateMany(
            {},
            { $set: { pendingMembership: null, pendingTransactionId: null } }
        );

        console.log(`Cleared pending status for ${result.modifiedCount} users.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
