const axios = require('axios');
require('dotenv').config();

const CASHFREE_ENV = process.env.CASHFREE_ENV || 'TEST';
const BASE_URL = CASHFREE_ENV === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

const getClientConfig = () => {
    return {
        id: (process.env.CASHFREE_CLIENT_ID || "").trim(),
        secret: (process.env.CASHFREE_CLIENT_SECRET || "").trim(),
        env: process.env.CASHFREE_ENV || 'TEST'
    };
};

const isCashfreeConfigured = () => {
    const { id, secret } = getClientConfig();
    const isConfigured = !!(id && secret && id !== 'placeholder' && !id.includes('placeholder'));
    console.log(`[DEBUG] Cashfree Config Check: ID=${id ? 'SET' : 'MISSING'}, Secret=${secret ? 'SET' : 'MISSING'}, Configured=${isConfigured}`);
    return isConfigured;
};

/**
 * Create a Payment Session for Cashfree Checkout SDK
 */
const createPaymentSession = async (orderId, amount, user) => {
    if (!isCashfreeConfigured()) {
        throw new Error('Cashfree PG is not configured properly.');
    }

    const payload = {
        order_id: orderId,
        order_amount: parseFloat(amount).toFixed(2),
        order_currency: 'INR',
        customer_details: {
            customer_id: user.userId.toString(),
            customer_name: `${user.firstName} ${user.lastName}`.trim(),
            customer_email: user.email,
            customer_phone: user.phone || '9999999999'
        },
        order_meta: {
            return_url: `${process.env.FRONTEND_URL || 'https://earningspl.com'}/membership?order_id={order_id}`
        }
    };

    const { id, secret } = getClientConfig();
    try {
        const response = await axios.post(`${BASE_URL}/orders`, payload, {
            headers: {
                'x-client-id': id,
                'x-client-secret': secret,
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json'
            }
        });

        return response.data; // Contains payment_session_id
    } catch (error) {
        console.error('❌ Cashfree Create Order Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create Cashfree order');
    }
};

/**
 * Verify Payment Status
 */
const verifyPayment = async (orderId) => {
    const { id, secret } = getClientConfig();
    try {
        const response = await axios.get(`${BASE_URL}/orders/${orderId}`, {
            headers: {
                'x-client-id': id,
                'x-client-secret': secret,
                'x-api-version': '2023-08-01'
            }
        });

        return response.data.order_status; // e.g., 'PAID', 'ACTIVE', 'EXPIRED'
    } catch (error) {
        console.error('❌ Cashfree Verify Order Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to verify Cashfree payment');
    }
};

module.exports = {
    isCashfreeConfigured,
    createPaymentSession,
    verifyPayment
};
