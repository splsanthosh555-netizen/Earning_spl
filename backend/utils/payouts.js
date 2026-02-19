const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAYX_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAYX_KEY_SECRET || 'secret_placeholder'
});

/**
 * Create a RazorpayX Payout
 * @param {Object} user - User object
 * @param {Object} bankDetails - User's bank details
 * @param {Number} amount - Amount in INR
 */
const createPayout = async (user, bankDetails, amount) => {
    try {
        // 1. Create/Get Contact
        // In a real app, you might want to save the vendor_id/contact_id in the User model
        const contactResponse = await razorpay.contacts.create({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            contact: user.phone || '9999999999',
            type: 'customer',
            reference_id: `user_${user.userId}`
        });

        // 2. Create Fund Account
        const fundAccountData = bankDetails.upiId ? {
            contact_id: contactResponse.id,
            account_type: 'vpa',
            vpa: { address: bankDetails.upiId }
        } : {
            contact_id: contactResponse.id,
            account_type: 'bank_account',
            bank_account: {
                name: bankDetails.accountHolderName,
                ifsc: bankDetails.ifscCode,
                account_number: bankDetails.accountNumber
            }
        };

        const fundAccount = await razorpay.fundAccounts.create(fundAccountData);

        // 3. Create Payout
        const payout = await razorpay.payouts.create({
            account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER || '456456456456', // Your RazorpayX account number
            fund_account_id: fundAccount.id,
            amount: amount * 100, // Razorpay works in paise
            currency: 'INR',
            mode: 'IMPS',
            purpose: 'payout',
            queue_if_low_balance: true,
            reference_id: `withdraw_${Date.now()}`
        });

        return payout;
    } catch (error) {
        console.error('RazorpayX Payout Error:', error);
        throw error;
    }
};

module.exports = { createPayout };
