const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    adminId: { type: Number, required: true },
    adminEmail: { type: String, required: true },
    action: { type: String, required: true }, // e.g., 'approve_withdrawal', 'reject_membership'
    targetId: { type: String, required: true }, // ID of the transaction or user affected
    details: { type: String },
    ipAddress: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
