require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const User = require('./models/User');
const Counter = require('./models/Counter');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/membership', require('./routes/membership'));
app.use('/api/referral', require('./routes/referral'));
app.use('/api/earnings', require('./routes/earnings'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// Seed admin user
const seedAdmin = async () => {
    try {
        const adminEmail = 'splsanthosh555@gmail.com';
        const adminPass = '010504spl';

        // 1. Try to find user by email first (regardless of isAdmin status)
        let admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            console.log('No user found with admin email, creating new admin account...');
            await Counter.findByIdAndUpdate(
                'userId',
                { seq: 1135839 },
                { upsert: true }
            );
            const adminUserId = await Counter.getNextUserId();

            admin = await User.create({
                userId: adminUserId,
                firstName: 'Santhosh',
                lastName: 'SPL',
                email: adminEmail,
                phone: '9502643906',
                password: adminPass,
                gender: 'male',
                membership: 'vip',
                membershipApproved: true,
                isAdmin: true,
                isActive: true
            });
            console.log(`Admin user created: ${admin.email} (ID: ${admin.userId})`);
        } else {
            console.log('User with admin email found, ensuring credentials and admin status...');
            admin.password = adminPass; // Force reset to default for recovery
            admin.isAdmin = true;
            admin.membership = 'vip';
            admin.membershipApproved = true;
            await admin.save();
            console.log(`Admin account verified/reset: ${admin.email} (ID: ${admin.userId})`);
        }
    } catch (error) {
        console.error('FATAL ERROR during admin seeding:', error);
    }
};

// Start
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    seedAdmin();
}).catch(err => {
    console.error('Database connection failed, but starting server for UI preview...');
});

app.listen(PORT, () => {
    console.log(`\n🚀 SPL-Earnings running on port ${PORT}`);
    console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API: http://localhost:${PORT}/api/health\n`);
});
