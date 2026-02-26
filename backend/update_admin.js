const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

const updateAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const userId = 1135841;
        const password = '010504@spl';
        // DO NOT hash here, let the model's pre-save handle it

        let user = await User.findOne({ userId });

        if (user) {
            console.log('Admin user found, updating details...');
            user.password = password; // pre-save will hash this
            user.isAdmin = true;
            user.firstName = 'Master';
            user.lastName = 'Admin';
            await user.save();
            console.log('Admin user updated successfully');
        } else {
            console.log('Admin user not found, creating new...');
            await User.create({
                userId,
                firstName: 'Master',
                lastName: 'Admin',
                email: 'admin@spl-earnings.com',
                phone: '9999999999',
                password, // Model will hash this on create
                isAdmin: true,
                isEmailVerified: true,
                isPhoneVerified: true,
                membership: 'vip',
                isActive: true
            });
            console.log('Admin user created successfully');
        }

        // De-admin other users to be safe (optional, but requested "no user can get admin pannel")
        await User.updateMany({ userId: { $ne: userId } }, { isAdmin: false });
        console.log('Other users restricted from admin access.');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

updateAdmin();
