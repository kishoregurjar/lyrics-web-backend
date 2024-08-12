const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ArtisBiblioSchema = new Schema({
    _id: { type: Schema.Types.ObjectId },
    Artist: { type: String, required: true },
    bibliography: { type: String, required: true },
    artistId: { type: String, required: true }
});

const ArtistBiblio = mongoose.model('artistBiblio', ArtisBiblioSchema);

module.exports = ArtistBiblio;