const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findOne({ userId: decoded.userId }).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }
            // Update last active date
            req.user.lastActiveDate = new Date();
            await req.user.save();
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token invalid' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ message: 'Admin access only' });
    }
};

module.exports = { protect, adminOnly };
