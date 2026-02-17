const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: Number, required: true, index: true },
    type: {
        type: String,
        enum: [
            'membership_purchase',
            'referral_income',
            'indirect_income',
            'shared_income',
            'admin_fee',
            'withdrawal',
            'upgrade',
            'inactive_transfer'
        ],
        required: true
    },
    amount: { type: Number, required: true },
    description: { type: String, default: '' },
    paymentTransactionId: { type: String, default: null },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'completed'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
