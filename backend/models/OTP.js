const axios = require('axios');

const sendPhoneOTP = async (phone, otp) => {
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

        console.log("Fast2SMS:", response.data);
        return response.data.return === true;

    } catch (error) {
        console.error("Fast2SMS Error:", error.response?.data || error.message);
        return false;
    }
};

module.exports = sendPhoneOTP;