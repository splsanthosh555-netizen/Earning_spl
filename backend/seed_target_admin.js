const mongoose = require('mongoose');
const User = require('./models/User');
const Counter = require('./models/Counter');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected...');

        const adminId = 1135841;
        const adminPass = '010504@spl';

        // Check if user exists
        let user = await User.findOne({ userId: adminId });

        if (user) {
            console.log('User 1135841 exists. Updating to admin with new password...');
            user.password = adminPass; // User model handles the hashing on save
            user.isAdmin = true;
            user.isActive = true;
            await user.save();
        } else {
            console.log('Creating admin user 1135841...');
            user = await User.create({
                userId: adminId,
                firstName: 'Santhosh',
                lastName: 'Admin',
                email: 'splsanthosh555@gmail.com',
                phone: '9502643906',
                password: adminPass,
                isAdmin: true,
                isActive: true,
                gender: 'male',
                membership: 'vip',
                membershipApproved: true
            });
        }

        // Set counter to start above this ID if necessary
        const counter = await Counter.findOne({ _id: 'userId' });
        if (!counter || counter.seq <= adminId) {
            await Counter.findOneAndUpdate(
                { _id: 'userId' },
                { seq: adminId + 1 },
                { upsert: true }
            );
        }

        console.log('✅ Admin user 1135841 seeded successfully!');
        console.log('User ID:', adminId);
        console.log('Password:', adminPass);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
