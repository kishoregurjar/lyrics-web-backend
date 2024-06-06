const mongoose = require('mongoose');

const hotAlbumSchema = new mongoose.Schema({
    images: [String],
    name: { type: String, required: true },
    releaseDate: { type: Date, required: true },
    artists: [String],
    isrc: { type: String, required: true },
    album: { type: String },
    genre: { type: String },
    duration: { type: Number },
    spotifyUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HotAlbum', hotAlbumSchema);
