const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },
        seq: {
            type: Number,
            default: 1135481 // New specified start ID
        }
    },
    { versionKey: false }
);

// Custom Smart UserID Generator
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

    let nextId = counter.seq;

    // 🔥 If exceeds 10 digits → adjust last 3 digits logic
    if (nextId.toString().length > 10) {

        const firstPart = nextId.toString().slice(0, 7); // keep first 7 digits
        const lastThree = 501; // reset pattern

        nextId = parseInt(firstPart + lastThree);

        counter.seq = nextId;
        await counter.save();
    }

    return nextId;
};

module.exports = mongoose.model('Counter', counterSchema);