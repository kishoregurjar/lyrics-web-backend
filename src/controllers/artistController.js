const ArtistAlbums = require("../models/allAlbumsAndSongSchema");
const ArtistDetails = require("../models/artistDetails")
const { catchRes, successRes } = require("../utils/response")

module.exports.getAllArtistName = async (req, res) => {
    try {
        const { query, page = 1, limit = 50 } = req.query;

        const filter = {
            artist_name: { $regex: `^${query}`, $options: 'i' }
        };

        const options = {
            skip: (page - 1) * limit,
            limit: parseInt(limit)
        };

        const artists = await ArtistDetails.find(filter, null, options);

        return successRes(res, 200, true, "All Artist Data", artists)
    } catch (error) {
        return catchRes(res, error);
    }
};

module.exports.getArtistAlbums = async (req, res) => {
    try {
        const { artist_id, page = 1 } = req.query;
        const limit = 50;
        const skip = (page - 1) * limit;

        const artistWithAlbums = await ArtistDetails.aggregate([
            { $match: { id: Number(artist_id) } },
            {
                $lookup: {
                    from: 'artistalbumsandsongs',
                    let: { artist_id: '$id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$artist_id', '$$artist_id'] }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                song_link: 0
                            }
                        },
                        { $skip: skip },
                        { $limit: limit }],
                    as: 'albums'
                }
            }
        ]);
        if (artistWithAlbums.length === 0) {
            return successRes(res, 404, false, "Artist Not Found", [])
        }

        const [artist] = artistWithAlbums;
        const { _id, artist_link, ...artistDetails } = artist;

        return successRes(res, 200, true, "Data Fetched successfully", artistDetails)
    } catch (error) {
        console.error('Error fetching artist albums:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};