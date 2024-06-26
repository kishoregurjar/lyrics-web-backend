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

        const artistsQuery = ArtistDetails.find(filter, null, options);
        const artistsCount = await ArtistDetails.countDocuments(filter);

        // Execute both queries in parallel
        const [artists, totalCount] = await Promise.all([artistsQuery, artistsCount]);

        // Calculate total pages
        const totalPages = Math.ceil(totalCount / limit);

        // Return response with pagination metadata
        return successRes(res, 200, true, "All Artist Data", {
            artists,
            currentPage: page,
            totalPages
        });
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
                        }
                    ],
                    as: 'albums'
                }
            }
        ]);
        if (artistWithAlbums.length === 0) {
            return successRes(res, 404, false, "Artist Not Found", []);
        }
        const [artist] = artistWithAlbums;
        const { _id, artist_link, albums, ...artistDetails } = artist;

        const totalAlbumsQuery = await ArtistAlbums.countDocuments({ artist_id: Number(artist_id) });

        const totalPages = Math.ceil(totalAlbumsQuery / limit);

        const paginatedAlbums = await ArtistAlbums.find({ artist_id: Number(artist_id) })
            .skip(skip)
            .limit(limit)
            .select('-_id -song_link');

        return successRes(res, 200, true, "Data Fetched successfully", {
            ...artistDetails,
            albums: paginatedAlbums,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching artist albums:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};



const axios = require('axios');

async function getLyrics(artist, song) {
    try {
        const response = await axios.get(`https://api.lyrics.ovh/v1/${artist}/${song}`);
        return response.data.lyrics;
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return 'Lyrics not found';
    }
}

// Example usage:
getLyrics('The Kooks', 'Forgive & Forget')
    .then(lyrics => console.log(lyrics))
    .catch(err => console.error(err));







