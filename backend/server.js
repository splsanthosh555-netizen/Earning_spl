require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // ✅ Added for IP check
const connectDB = require('./config/db');
const setupCronJobs = require('./utils/cron');
const User = require('./models/User');
const Counter = require('./models/Counter');
const Membership = require('./models/Membership');
const authRoutes = require('./routes/auth');
const app = express();

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://earning-spl-5e2a.vercel.app',
        'https://earningspl.com',
        'https://www.earningspl.com'
    ],
    credentials: true
}));
app.use(express.json());

// DEBUG: Log all requests
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', require('./routes/user'));
app.use('/api/membership', require('./routes/membership'));
app.use('/api/referral', require('./routes/referral'));
app.use('/api/earnings', require('./routes/earnings'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Diagnostic Route
app.get('/api/env-check', (req, res) => {
    res.json({
        EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'MISSING',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'MISSING',
        TWILIO_SID: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING',
        TWILIO_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING',
        TWILIO_PHONE: process.env.TWILIO_PHONE_NUMBER ? 'SET' : 'MISSING',
        CASHFREE_ID: process.env.CASHFREE_CLIENT_ID ? 'SET' : 'MISSING',
        CASHFREE_SECRET: process.env.CASHFREE_CLIENT_SECRET ? 'SET' : 'MISSING'
    });
});

// Serve frontend in production

const seedMemberships = async () => {
    try {
        const count = await Membership.countDocuments();
        if (count === 0) {
            console.log('Seeding initial memberships...');
            const defaultMemberships = [
                { type: 'bronze', name: 'Bronze', cost: 1, referralEarningPercent: 20, indirectEarningPercent: 1, adminFeePercent: 10, rank: 1, features: ['20% Direct Referral Income', '1% Indirect Referral income', '10% Admin Fees'] },
                { type: 'silver', name: 'Silver', cost: 100, referralEarningPercent: 30, indirectEarningPercent: 2, adminFeePercent: 10, rank: 2, features: ['30% Direct Referral Income', '2% Indirect Referral income', '10% Admin Fees'] },
                { type: 'gold', name: 'Gold', cost: 200, referralEarningPercent: 35, indirectEarningPercent: 2, adminFeePercent: 10, rank: 3, features: ['40% Direct Referral Income', '2% Indirect Referral income', '10% Admin Fees'] },
                { type: 'diamond', name: 'Diamond', cost: 350, referralEarningPercent: 40, indirectEarningPercent: 10, adminFeePercent: 0, rank: 4, features: ['40% Direct Referral Income', '10% Indirect Referral income', 'ZERO Admin Fees'] },
                { type: 'platinum', name: 'Platinum', cost: 500, referralEarningPercent: 40, indirectEarningPercent: 15, adminFeePercent: 0, rank: 5, features: ['40% Direct Referral Income', '15% Indirect Referral income', 'ZERO Admin Fees'] }
            ];
            await Membership.insertMany(defaultMemberships);
            console.log('✅ Default memberships seeded.');
        }
    } catch (error) {
        console.error('Membership seeding error:', error);
    }
};

// Seed admin user
const seedAdmin = async () => {
    try {
        const adminEmail = 'splsanthosh555@gmail.com';
        const adminPass = '010504spl';

        let admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            console.log('Creating new admin account...');
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

            console.log(`Admin user created: ${admin.email}`);
        } else {
            console.log('Admin exists, resetting credentials...');
            admin.password = adminPass;
            admin.isAdmin = true;
            admin.membership = 'vip';
            admin.membershipApproved = true;
            await admin.save();

            admin.walletBalance = admin.totalEarnings;
            await admin.save();

            const Transaction = require('./models/Transaction');
            await Transaction.deleteMany({ userId: admin.userId, type: 'withdrawal' });

            console.log(`Admin account verified/reset: ${admin.email}`);
        }
    } catch (error) {
        console.error('Admin seeding error:', error);
    }
};

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    seedMemberships();
    seedAdmin();
    setupCronJobs(); // Start automated daily checks
}).catch(err => {
    console.error('Database connection failed, but server will still start.');
});

app.listen(PORT, () => {
    console.log(`\n🚀 SPL-Earnings running on port ${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API: http://localhost:${PORT}/api/health\n`);

    // 🔥 TEMP: Get Render Public IP
    axios.get("https://api.ipify.org?format=json")
        .then(res => console.log("🌍 Render Public IP:", res.data.ip))
        .catch(err => console.log("IP Fetch Error:", err.message));
});