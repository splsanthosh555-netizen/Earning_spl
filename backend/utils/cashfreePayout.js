const axios = require('axios');
require('dotenv').config();

// Cashfree Payouts API Configuration
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'TEST'; // 'TEST' or 'PRODUCTION'
const BASE_URL = CASHFREE_ENV === 'PRODUCTION'
    ? 'https://payout-api.cashfree.com'
    : 'https://payout-gamma.cashfree.com';

const CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

let authToken = null;
let tokenExpiry = 0;

/**
 * Check if Cashfree Payouts is configured
 */
const isCashfreeConfigured = () => {
    return CLIENT_ID && CLIENT_SECRET &&
        CLIENT_ID !== 'placeholder' &&
        !CLIENT_ID.includes('placeholder');
};

/**
 * Authenticate with Cashfree and get bearer token
 */
const authenticate = async () => {
    // Reuse token if still valid (expires in 5 min, refresh at 4 min)
    if (authToken && Date.now() < tokenExpiry) {
        return authToken;
    }

    try {
        const response = await axios.post(`${BASE_URL}/payout/v1/authorize`, {}, {
            headers: {
                'X-Client-Id': CLIENT_ID,
                'X-Client-Secret': CLIENT_SECRET,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.status === 'SUCCESS') {
            authToken = response.data.data.token;
            tokenExpiry = Date.now() + 4 * 60 * 1000; // 4 minutes
            console.log('✅ Cashfree Payouts authenticated');
            return authToken;
        } else {
            throw new Error(response.data.message || 'Authentication failed');
        }
    } catch (error) {
        console.error('❌ Cashfree Auth Error:', error.response?.data || error.message);
        throw new Error('Cashfree authentication failed');
    }
};

/**
 * Add a beneficiary (recipient)
 */
const addBeneficiary = async (userId, bankDetails) => {
    const token = await authenticate();
    const beneficiaryId = `SPL_${userId}_${Date.now()}`;

    const payload = {
        beneId: beneficiaryId,
        name: bankDetails.accountHolderName || `User ${userId}`,
        email: bankDetails.email || 'user@earningspl.com',
        phone: bankDetails.phone || '9999999999',
    };

    // Add UPI or Bank Account details
    if (bankDetails.upiId) {
        payload.vpa = bankDetails.upiId;
    } else {
        payload.bankAccount = bankDetails.accountNumber;
        payload.ifsc = bankDetails.ifscCode;
    }

    try {
        const response = await axios.post(`${BASE_URL}/payout/v1/addBeneficiary`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.status === 'SUCCESS') {
            console.log(`✅ Beneficiary added: ${beneficiaryId}`);
            return beneficiaryId;
        } else {
            throw new Error(response.data.message || 'Failed to add beneficiary');
        }
    } catch (error) {
        // If beneficiary already exists, that's OK
        if (error.response?.data?.subCode === '409') {
            console.log(`ℹ️ Beneficiary already exists: ${beneficiaryId}`);
            return beneficiaryId;
        }
        console.error('❌ Add Beneficiary Error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Create a payout transfer to UPI or Bank Account
 */
const createCashfreePayout = async (user, bankDetails, amount) => {
    if (!isCashfreeConfigured()) {
        throw new Error('Cashfree Payouts not configured. Set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET.');
    }

    try {
        // Step 1: Add beneficiary
        const beneficiaryId = await addBeneficiary(user.userId, bankDetails);

        // Step 2: Create transfer
        const token = await authenticate();
        const transferId = `WD_${user.userId}_${Date.now()}`;

        const payload = {
            beneId: beneficiaryId,
            amount: amount.toString(),
            transferId: transferId,
            transferMode: bankDetails.upiId ? 'upi' : 'imps',
            remarks: `Withdrawal from SPL-Earnings wallet`
        };

        const response = await axios.post(`${BASE_URL}/payout/v1/requestTransfer`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.status === 'SUCCESS') {
            console.log(`✅ Payout created: ${transferId} | ₹${amount} to ${bankDetails.upiId || bankDetails.accountNumber}`);
            return {
                id: transferId,
                referenceId: response.data.data?.referenceId || transferId,
                status: 'SUCCESS'
            };
        } else {
            throw new Error(response.data.message || 'Payout failed');
        }
    } catch (error) {
        console.error('❌ Cashfree Payout Error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Check payout status
 */
const getPayoutStatus = async (transferId) => {
    const token = await authenticate();

    try {
        const response = await axios.get(`${BASE_URL}/payout/v1/getTransferStatus?transferId=${transferId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('❌ Payout Status Error:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = {
    isCashfreeConfigured,
    createCashfreePayout,
    getPayoutStatus
};
