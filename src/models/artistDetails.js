const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArtistDetailsSchema = new Schema({
    _id: { type: Schema.Types.ObjectId },
    id: { type: Number, required: true },
    alphabet: { type: String, required: true },
    artist_name: { type: String, required: true },
    artist_link: { type: String, required: true },
    status: { type: Number, required: true }
});

const ArtistDetails = mongoose.model('AllArtistDetails', ArtistDetailsSchema);

module.exports = ArtistDetails;
