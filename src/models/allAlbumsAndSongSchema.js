const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SongSchema = new Schema({
    _id: { type: Schema.Types.ObjectId },
    id: { type: Number, required: true }, // Primary key in SongSchema
    artist_id: { type: Number, ref: 'ArtistDetails', required: true }, // Foreign key referencing ArtistDetails
    album_name: { type: String, required: true },
    song_name: { type: String, required: true }
});

const ArtistAlbums = mongoose.model('ArtistAlbumsAndSongs', SongSchema);

module.exports = ArtistAlbums;
