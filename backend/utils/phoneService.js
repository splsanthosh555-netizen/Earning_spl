const axios = require('axios');

const sendPhoneOTP = async (phone, otp) => {
    await axios.get(
        `https://api.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=91${phone}&authkey=${process.env.MSG91_AUTHKEY}&otp=${otp}`
    );
};

module.exports = sendPhoneOTP;