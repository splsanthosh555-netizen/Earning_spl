const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true, index: true },
    bankName: { type: String, required: true, trim: true },
    accountHolderName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    ifscCode: { type: String, required: true, trim: true, uppercase: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BankDetails', bankDetailsSchema);
