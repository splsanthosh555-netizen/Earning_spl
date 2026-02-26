const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ===============================
// PROTECT (Login Required)
// ===============================
const protect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({ userId: decoded.userId }).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error('Auth Error:', error);
        return res.status(401).json({ message: 'Not authorized' });
    }
};

// ===============================
// ADMIN ONLY
// ===============================
const adminOnly = (req, res, next) => {
    // Strictly ONLY User ID 1135841 can access admin routes
    if (!req.user || !req.user.isAdmin || req.user.userId !== 1135841) {
        return res.status(403).json({ message: 'Access Denied: Restricted Admin Access' });
    }
    next();
};

module.exports = { protect, adminOnly };