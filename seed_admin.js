const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './backend/.env' });
const User = require('./backend/models/User');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const adminId = 1135840;
        const existing = await User.findOne({ userId: adminId });

        if (existing) {
            console.log('Admin already exists. Updating details...');
            existing.userId = adminId;
            existing.firstName = 'Santhosh';
            existing.lastName = 'SPL';
            existing.email = 'splsanthosh28@gmail.com';
            existing.phone = '9502643906';
            existing.password = 'asdfg@1135840'; // Will be hashed by pre-save
            existing.membership = 'vip';
            existing.isAdmin = true;
            existing.isActive = true;
            await existing.save();
        } else {
            console.log('Creating new Admin...');
            await User.create({
                userId: adminId,
                firstName: 'Santhosh',
                lastName: 'SPL',
                email: 'splsanthosh28@gmail.com',
                phone: '9502643906',
                password: 'asdfg@1135840',
                membership: 'vip',
                gender: 'male',
                isAdmin: true,
                isActive: true
            });
        }

        console.log('Admin seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
