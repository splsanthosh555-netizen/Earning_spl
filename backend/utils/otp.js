const crypto = require('crypto');
const axios = require('axios');
const { Resend } = require('resend');
const OTP = require('../models/OTP');

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate 6 digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP
const hashOTP = (otp) => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

// Send Email via Resend
const sendEmail = async (email, otp) => {
    try {
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: 'SPL Earnings OTP Verification',
            html: `
                <h2>Your OTP is ${otp}</h2>
                <p>This OTP expires in 5 minutes.</p>
            `
        });

        return true;
    } catch (error) {
        console.error("Resend Error:", error.message);
        return false;
    }
};

// Send SMS via Fast2SMS
const sendSMS = async (phone, otp) => {
    try {
        const response = await axios.get(
            'https://www.fast2sms.com/dev/otp',
            {
                params: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    route: 'otp',
                    variables_values: otp,
                    numbers: phone
                }
            }
        );

        return response.data.return === true;
    } catch (error) {
        console.error("Fast2SMS Error:", error.response?.data || error.message);
        return false;
    }
};

// Main Send OTP
const sendOTP = async (target, type) => {

    await OTP.deleteMany({ target, type });

    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.create({
        target,
        type,
        otp: hashedOTP,
        expiresAt,
        verified: false
    });

    let sent = false;

    if (type === 'email') {
        sent = await sendEmail(target, otp);
    } else if (type === 'phone') {
        sent = await sendSMS(target, otp);
    }

    console.log(`OTP for ${type} (${target}) Sent: ${sent}`);
    return { sent };
};

// Verify OTP
const verifyOTP = async (target, type, otp) => {

    const hashedOTP = hashOTP(otp);

    const otpRecord = await OTP.findOne({
        target,
        type,
        otp: hashedOTP,
        verified: false,
        expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) return false;

    otpRecord.verified = true;
    await otpRecord.save();

    return true;
};

module.exports = { sendOTP, verifyOTP };