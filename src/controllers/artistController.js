const { default: axios } = require("axios");
const ArtistAlbums = require("../models/allAlbumsAndSongSchema");
const ArtistDetails = require("../models/artistDetails");
const ArtistSongs = require("../models/artistSongs");
const { catchRes, successRes } = require("../utils/response")

module.exports.getAllArtistName = async (req, res) => {
    try {
        const { query, page = 1, limit = 50 } = req.query;

        const filter = {
            artist_name: { $regex: `^${query}`, $options: 'i' },
            status: true
        };

        const options = {
            skip: (page - 1) * limit,
            limit: parseInt(limit)
        };

        const artistsQuery = ArtistDetails.find(filter, null, options);
        const artistsCount = await ArtistDetails.countDocuments(filter);

        const [artists, totalCount] = await Promise.all([artistsQuery, artistsCount]);

        const totalPages = Math.ceil(totalCount / limit);

        return successRes(res, 200, true, "All Artist Data", {
            artists,
            totalCount,
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
        const totalAlbums = totalPages * limit
        const paginatedAlbums = await ArtistAlbums.find({ artist_id: Number(artist_id) })
            .skip(skip)
            .limit(limit)
            .select('-_id -song_link');

        const uniqueAlbumsSet = new Set();
        const uniqueAlbums = [];

        paginatedAlbums.forEach(album => {
            const cleanedAlbumName = album.album_name.replace(/["/]/g, '');
            if (!uniqueAlbumsSet.has(cleanedAlbumName)) {
                uniqueAlbumsSet.add(cleanedAlbumName);
                uniqueAlbums.push({
                    artist_id: album.artist_id,
                    album_name: cleanedAlbumName
                });
            }
        });

        return successRes(res, 200, true, "Data Fetched successfully", {
            ...artistDetails,
            albums: uniqueAlbums,
            currentPage: page,
            totalPages,
            totalAlbums

        });
    } catch (error) {
        console.error('Error fetching artist albums:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports.getArtiSongs = async (req, res) => {
    try {
        const { song_name, page = 1, pageSize = 10 } = req.query;

        const pageNumber = parseInt(page);
        const pageSizeNumber = parseInt(pageSize);

        const query = {};
        if (song_name) query.song_name = { $regex: song_name, $options: 'i' }; // Case-insensitive regex search
        if (artist_name) query.artist_name = { $regex: artist_name, $options: 'i' }; // Case-insensitive regex search

        const totalCount = await ArtistSongs.countDocuments(query);

        const totalPages = Math.ceil(totalCount / pageSizeNumber);

        const songs = await ArtistSongs.find(query)
            .skip((pageNumber - 1) * pageSizeNumber)
            .limit(pageSizeNumber);
        res.json({
            songs,
            totalCount,
            totalPages
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

module.exports.getSongsOfAlbums = async (req, res) => {
    try {
        const { album_name, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const totalDocuments = await ArtistAlbums.countDocuments({ album_name });
        const totalPages = Math.ceil(totalDocuments / limit);

        const songs = await ArtistAlbums.aggregate([
            { $match: { album_name } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'allartistdetails', // collection name in the database
                    localField: 'artist_id',
                    foreignField: 'id',
                    as: 'artistDetails'
                }
            },
            { $unwind: '$artistDetails' }, // Assuming each song has one artist
            {
                $project: {
                    _id: 1,
                    id: 1,
                    artist_id: 1,
                    album_name: 1,
                    song_name: 1,
                    song_link: 1,
                    'artistDetails.artist_name': 1
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            status: 200,
            message: "Data Fetched successfully",
            data: {
                songs,
                currentPage: page,
                totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching songs of album:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};







