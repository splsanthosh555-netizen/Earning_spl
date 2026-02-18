const nodemailer = require('nodemailer');
const twilio = require('twilio');
const OTP = require('../models/OTP');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendEmail = async (target, otp) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('EMAIL_USER or EMAIL_PASS not set, skipping real email send.');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"SPL-EARNINGS" <${process.env.EMAIL_USER}>`,
        to: target,
        subject: 'Your SPL-EARNINGS Verification Code',
        text: `Your verification code is: ${otp}. This code expires in 10 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px;">
                <h2 style="color: #7c3aed;">SPL-EARNINGS Verification</h2>
                <p>Use the following code to verify your identity:</p>
                <div style="font-size: 32px; font-weight: bold; color: #7c3aed; letter-spacing: 5px; margin: 20px 0;">${otp}</div>
                <p style="color: #666; font-size: 12px;">This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to: ${target}`);
    } catch (error) {
        console.error('Nodemailer Error:', error);
    }
};

const sendSMS = async (target, otp) => {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.warn('Twilio credentials not set, skipping real SMS send.');
        return;
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    try {
        await client.messages.create({
            body: `Your SPL-EARNINGS verification code is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: target.startsWith('+') ? target : `+91${target}` // Assuming Indian user, add country code if missing
        });
        console.log(`SMS sent to: ${target}`);
    } catch (error) {
        console.error('Twilio Error:', error);
    }
};

const sendOTP = async (target, type) => {
    // Delete any existing OTPs for this target
    await OTP.deleteMany({ target, type });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({ target, type, otp, expiresAt });

    // Send real OTP
    if (type === 'email') {
        await sendEmail(target, otp);
    } else {
        await sendSMS(target, otp);
    }

    // Always log to console for development troubleshooting
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
