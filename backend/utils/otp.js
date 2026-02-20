const nodemailer = require('nodemailer');
const twilio = require('twilio');
const OTP = require('../models/OTP');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendEmail = async (target, otp) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('EMAIL_USER or EMAIL_PASS not set, skipping real email send.');
        return false;
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
        return true;
    } catch (error) {
        console.error('Nodemailer Error:', error);
        return false;
    }
};

const sendSMS = async (target, otp) => {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.warn('Twilio credentials not set, skipping real SMS send.');
        return false;
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    try {
        await client.messages.create({
            body: `Your SPL-EARNINGS verification code is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: target.startsWith('+') ? target : `+91${target}`
        });
        console.log(`SMS sent to: ${target}`);
        return true;
    } catch (error) {
        console.error('Twilio Error:', error);
        return false;
    }
};

const sendOTP = async (target, type) => {
    // Delete any existing OTPs for this target
    await OTP.deleteMany({ target, type });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({ target, type, otp, expiresAt });

    // Send real OTP
    let sent = false;
    if (type === 'email') {
        sent = await sendEmail(target, otp);
    } else {
        sent = await sendSMS(target, otp);
    }

    // Logging for troubleshooting
    console.log(`\n========================================`);
    console.log(`  OTP for ${type} (${target}): ${otp} | Sent: ${sent}`);
    console.log(`========================================\n`);

    return { otp, sent };
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
