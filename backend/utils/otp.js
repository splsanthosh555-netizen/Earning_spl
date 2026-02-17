const OTP = require('../models/OTP');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (target, type) => {
    // Delete any existing OTPs for this target
    await OTP.deleteMany({ target, type });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({ target, type, otp, expiresAt });

    // In development: log OTP to console
    // In production: integrate real SMS/email service  
    console.log(`\n========================================`);
    console.log(`  OTP for ${type} (${target}): ${otp}`);
    console.log(`========================================\n`);

    return otp;
};

const verifyOTP = async (target, type, otp) => {
    const otpRecord = await OTP.findOne({
        target,
        type,
        otp,
        verified: false,
        expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) return false;

    otpRecord.verified = true;
    await otpRecord.save();
    return true;
};

const isOTPVerified = async (target, type) => {
    const otpRecord = await OTP.findOne({
        target,
        type,
        verified: true,
        expiresAt: { $gt: new Date() }
    });
    return !!otpRecord;
};

module.exports = { sendOTP, verifyOTP, isOTPVerified };
