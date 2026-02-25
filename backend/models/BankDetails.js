const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const bankDetailsSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true, index: true },
    bankName: { type: String, required: true, trim: true },
    accountHolderName: { type: String, required: true, trim: true },
    accountNumber: {
        type: String,
        required: true,
        trim: true,
        get: decrypt,
        set: encrypt
    },
    ifscCode: { type: String, required: true, trim: true, uppercase: true },
    upiId: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { toJSON: { getters: true }, toObject: { getters: true } });

module.exports = mongoose.model('BankDetails', bankDetailsSchema);
