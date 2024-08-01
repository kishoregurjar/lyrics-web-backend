// const mongoose = require('mongoose');

// const hotAlbumSchema = new mongoose.Schema({
//     images: [String],
//     name: { type: String, required: true },
//     releaseDate: { type: Date, required: true },
//     artists: [String],
//     isrc: { type: String, required: true },
//     album: { type: String },
//     genre: { type: String },
//     duration: { type: Number },
//     spotifyUrl: { type: String },
//     territory: { type: String },
//     createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('HotAlbum', hotAlbumSchema);


const mongoose = require('mongoose');

const hotAlbumSchema = new mongoose.Schema({
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

module.exports = mongoose.model('HotAlbum', hotAlbumSchema);

