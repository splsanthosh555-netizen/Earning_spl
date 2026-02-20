const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmailOTP = async (email, otp) => {
    const message = {
        to: email,
        from: 'no-reply@earningspl.com', // temporary
        subject: 'Your OTP - SPL Earnings',
        html: `
            <div style="font-family: Arial; padding: 20px;">
                <h2>SPL Earnings Verification</h2>
                <p>Your OTP is:</p>
                <h1 style="letter-spacing: 5px;">${otp}</h1>
                <p>This OTP expires in 5 minutes.</p>
            </div>
        `
    };

    await sgMail.send(message);
};

module.exports = sendEmailOTP;