const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    target: { type: String, required: true },
    type: { type: String, enum: ['email', 'phone'], required: true },
    otp: { type: String, required: true },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OTP', otpSchema);
