const crypto = require('crypto');
const axios = require('axios');
const sgMail = require('@sendgrid/mail');
const OTP = require('../models/OTP');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// 🔢 Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// 🔐 Hash OTP before storing
const hashOTP = (otp) => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

// 📧 Send Email using SendGrid
const sendEmail = async (target, otp) => {
    try {
        const message = {
            to: target,
            from: 'no-reply@earningspl.com',
            subject: 'SPL Earnings Verification Code',
            html: `
                <div style="font-family: Arial; padding: 20px;">
                    <h2>SPL Earnings Verification</h2>
                    <p>Your OTP is:</p>
                    <h1 style="letter-spacing: 5px;">${otp}</h1>
                    <p>This code expires in 5 minutes.</p>
                </div>
            `
        };

        await sgMail.send(message);
        return true;
    } catch (error) {
        console.error("SendGrid Error:", error.response?.body || error.message);
        return false;
    }
};

// 📱 Send SMS using MSG91
const sendSMS = async (target, otp) => {
    try {
        await axios.get(
            `https://api.msg91.com/api/v5/otp`,
            {
                params: {
                    template_id: process.env.MSG91_TEMPLATE_ID,
                    mobile: `91${target}`,
                    authkey: process.env.MSG91_AUTHKEY,
                    otp: otp
                }
            }
        );

        return true;
    } catch (error) {
        console.error("MSG91 Error:", error.response?.data || error.message);
        return false;
    }
};

// 🔥 Main Send OTP Function
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

// 🔎 Verify OTP
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