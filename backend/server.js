require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // ✅ Added for IP check
const connectDB = require('./config/db');
const User = require('./models/User');
const Counter = require('./models/Counter');
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

// Diagnostic Route
app.get('/api/env-check', (req, res) => {
    res.json({
        EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'MISSING',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'MISSING',
        TWILIO_SID: process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'MISSING',
        TWILIO_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'MISSING',
        TWILIO_PHONE: process.env.TWILIO_PHONE_NUMBER ? 'SET' : 'MISSING'
    });
});

// Serve frontend in production

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
    seedAdmin();
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