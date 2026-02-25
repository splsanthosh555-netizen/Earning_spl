const axios = require('axios');
const crypto = require('crypto');

/**
 * PhonePe Payment Gateway Utility
 * 
 * Required Environment Variables on Render:
 * PHONEPE_MERCHANT_ID
 * PHONEPE_SALT_KEY
 * PHONEPE_SALT_INDEX (usually 1)
 * PHONEPE_ENV (UAT or PRODUCTION)
 * BACKEND_URL (e.g. https://spl-earnings.onrender.com)
 */

const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY;
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || 1;
const PHONEPE_ENV = process.env.PHONEPE_ENV || 'UAT'; // 'UAT' or 'PRODUCTION'

const BASE_URL = PHONEPE_ENV === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const isPhonePeConfigured = () => {
    return !!(PHONEPE_MERCHANT_ID && PHONEPE_SALT_KEY && PHONEPE_MERCHANT_ID !== 'placeholder');
};

/**
 * Initiate a payment request
 */
const initiatePhonePePayment = async (orderId, amount, userId) => {
    const endpoint = '/pg/v1/pay';
    const callbackUrl = `${process.env.BACKEND_URL}/api/membership/phonepe-callback`;

    const payload = {
        merchantId: PHONEPE_MERCHANT_ID,
        merchantTransactionId: orderId,
        merchantUserId: `USER_${userId}`,
        amount: amount * 100, // Amount in Paise
        redirectUrl: `${process.env.FRONTEND_URL}/membership?orderId=${orderId}`, // User returns here
        redirectMode: 'REDIRECT',
        callbackUrl: callbackUrl, // Wehhhook/Callback
        paymentInstrument: {
            type: 'PAY_PAGE'
        }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const stringToSign = base64Payload + endpoint + PHONEPE_SALT_KEY;
    const sha256Hash = crypto.createHash('sha256').update(stringToSign).digest('hex');
    const checksum = sha256Hash + '###' + PHONEPE_SALT_INDEX;

    try {
        const response = await axios.post(`${BASE_URL}${endpoint}`, {
            request: base64Payload
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'accept': 'application/json'
            }
        });

        if (response.data.success) {
            return {
                url: response.data.data.instrumentResponse.redirectInfo.url,
                merchantTransactionId: orderId
            };
        } else {
            throw new Error(response.data.message || 'PhonePe payment initiation failed');
        }
    } catch (error) {
        console.error('PhonePe Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'PhonePe Initiation Error');
    }
};

/**
 * Verify payment status
 */
const verifyPhonePePayment = async (merchantTransactionId) => {
    const endpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
    const stringToSign = endpoint + PHONEPE_SALT_KEY;
    const sha256Hash = crypto.createHash('sha256').update(stringToSign).digest('hex');
    const checksum = sha256Hash + '###' + PHONEPE_SALT_INDEX;

    try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': PHONEPE_MERCHANT_ID,
                'accept': 'application/json'
            }
        });

        if (response.data.success && response.data.code === 'PAYMENT_SUCCESS') {
            return 'PAID';
        } else if (response.data.code === 'PAYMENT_PENDING') {
            return 'PENDING';
        } else {
            return 'FAILED';
        }
    } catch (error) {
        console.error('PhonePe Verify Error:', error.response?.data || error.message);
        return 'ERROR';
    }
};

module.exports = {
    isPhonePeConfigured,
    initiatePhonePePayment,
    verifyPhonePePayment
};
