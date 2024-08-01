const mongoose = require('mongoose');

const topChartSchema = new mongoose.Schema({
    lfid: { type: String },
    title: { type: String, required: true },
    image: { type: String },
    artists: [{ type: String, required: true }],
    duration: { type: String },
    isrc: { type: String },
    has_lrc: { type: Boolean },
    copyright: { type: String },
    writer: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TopChart', topChartSchema);
