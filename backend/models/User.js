const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    userId: { type: Number, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    referredBy: { type: Number, default: null },
    membership: {
        type: String,
        enum: ['none', 'bronze', 'silver', 'gold', 'diamond', 'platinum', 'vip'],
        default: 'none'
    },
    membershipApproved: { type: Boolean, default: false },
    pendingMembership: { type: String, default: null },
    pendingTransactionId: { type: String, default: null },
    walletBalance: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastActiveDate: { type: Date, default: Date.now },
    isAdmin: { type: Boolean, default: false },
    directReferralCount: { type: Number, default: 0 },
    indirectReferralCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    console.log(`[DEBUG] Hashing password for user: ${this.email} (Length: ${this.password.length})`);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log(`[DEBUG] Password hashed successfully for: ${this.email}`);
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
