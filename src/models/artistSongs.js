const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArtistSongSchema = new Schema({
    _id: { type: Schema.Types.ObjectId },
    id: { type: Number, required: true },
    alphabet: { type: Number },
    artist_name: { type: String },
    artist_link: { type: String },
    song_link: { type: String },
    album_name: { type: String, required: true },
    song_name: { type: String, required: true },
    status: { type: Boolean, required: true },
    song_lyrics: { type: String, required: true }
});


const ArtistSongs = mongoose.model('ArtistSongs', ArtistSongSchema);

module.exports = ArtistSongs;