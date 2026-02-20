const crypto = require('crypto');
const axios = require('axios');
const { Resend } = require('resend');
const OTP = require('../models/OTP');

// ==============================
// INIT RESEND
// ==============================
const resend = new Resend(process.env.RESEND_API_KEY);

// ==============================
// GENERATE 6 DIGIT OTP
// ==============================
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// ==============================
// HASH OTP (SECURE STORAGE)
// ==============================
const hashOTP = (otp) => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

// ==============================
// SEND EMAIL (RESEND)
// ==============================
const sendEmail = async (target, otp) => {
    try {
        const response = await resend.emails.send({
            from: 'onboarding@resend.dev', // Safe testing sender
            to: target,
            subject: 'SPL Earnings OTP Verification',
            html: `
                <div style="font-family: Arial; padding: 20px;">
                    <h2>SPL Earnings Verification</h2>
                    <p>Your OTP is:</p>
                    <h1 style="letter-spacing: 5px;">${otp}</h1>
                    <p>This code expires in 5 minutes.</p>
                </div>
            `
        });

        console.log("Resend Response:", response);
        return true;

    } catch (error) {
        console.error("Resend Error:", error.response?.data || error.message);
        return false;
    }
};

// ==============================
// SEND SMS (FAST2SMS - INDIA)
// ==============================
const sendSMS = async (target, otp) => {
    try {
        const cleanNumber = target.startsWith('+91')
            ? target.replace('+91', '')
            : target;

        const response = await axios.get(
            'https://www.fast2sms.com/dev/bulkV2',
            {
                params: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    route: 'otp',
                    variables_values: otp,
                    numbers: cleanNumber
                }
            }
        );

        console.log("Fast2SMS Response:", response.data);

        return response.data.return === true;

    } catch (error) {
        console.error("Fast2SMS Error:", error.response?.data || error.message);
        return false;
    }
};

// ==============================
// MAIN SEND OTP FUNCTION
// ==============================
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
    }

    if (type === 'phone') {
        sent = await sendSMS(target, otp);
    }

    console.log(`OTP for ${type} (${target}) Sent: ${sent}`);

    return { sent };
};

// ==============================
// VERIFY OTP
// ==============================
const verifyOTP = async (target, type, otp) => {

    const hashedOTP = hashOTP(otp);

    const otpRecord = await OTP.findOne({
        target,
        type,
        otp: hashedOTP,
        verified: false,
        expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
        console.log("OTP Verification Failed");
        return false;
    }

    otpRecord.verified = true;
    await otpRecord.save();

    console.log("OTP Verified Successfully");
    return true;
};

module.exports = { sendOTP, verifyOTP };