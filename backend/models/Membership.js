const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        unique: true,
        enum: ['bronze', 'silver', 'gold', 'diamond', 'platinum', 'vip']
    },
    name: { type: String, required: true },
    cost: { type: Number, required: true },
    referralEarningPercent: { type: Number, required: true },
    indirectEarningPercent: { type: Number, required: true },
    adminFeePercent: { type: Number, default: 10 },
    rank: { type: Number, required: true }, // For determining upgrade sequence
    isActive: { type: Boolean, default: true },
    features: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Membership', membershipSchema);
