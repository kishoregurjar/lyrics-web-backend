const mongoose = require('mongoose');

const topChartSchema = new mongoose.Schema({
    lfid: { type: String, required: true },
    title: { type: String, required: true },
    artists: [{ type: String, required: true }],
    duration: { type: Number },
    isrc: { type: String },
    has_lrc: { type: Boolean },
    copyright: { type: String },
    writer: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TopChart', topChartSchema);
