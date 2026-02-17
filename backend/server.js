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
        const adminExists = await User.findOne({ isAdmin: true });
        if (!adminExists) {
            await Counter.findByIdAndUpdate(
                'userId',
                { seq: 1135839 },
                { upsert: true }
            );
            const adminUserId = await Counter.getNextUserId();

            await User.create({
                userId: adminUserId,
                firstName: 'Santhosh',
                lastName: 'SPL',
                email: 'splsanthosh28@gmail.com',
                phone: '9502643906',
                password: 'asdfg@1135840',
                gender: 'male',
                membership: 'vip',
                membershipApproved: true,
                isAdmin: true,
                isActive: true
            });
            console.log(`Admin user created with ID: ${adminUserId}`);
        } else {
            console.log(`Admin user already exists with ID: ${adminExists.userId}`);
        }
    } catch (error) {
        console.error('Admin seed error:', error.message);
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
