const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },
        seq: {
            type: Number,
            default: 0
        }
    },
    {
        versionKey: false
    }
);

// Static method to generate next userId
counterSchema.statics.getNextUserId = async function () {
    const counter = await this.findByIdAndUpdate(
        'userId',
        { $inc: { seq: 1 } },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return counter.seq;
};

module.exports = mongoose.model('Counter', counterSchema);