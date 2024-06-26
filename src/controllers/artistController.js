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

        // Using Set to filter out duplicate album names
        const uniqueAlbumsSet = new Set();
        const uniqueAlbums = [];

        paginatedAlbums.forEach(album => {
            if (!uniqueAlbumsSet.has(album.album_name)) {
                uniqueAlbumsSet.add(album.album_name);
                uniqueAlbums.push({
                    artist_id: album.artist_id,
                    album_name: album.album_name
                });
            }
        });

        return successRes(res, 200, true, "Data Fetched successfully", {
            ...artistDetails,
            albums: uniqueAlbums,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching artist albums:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


// module.exports.getArtistAlbums = async (req, res) => {
//     try {
//         const { artist_id, page = 1 } = req.query;
//         const limit = 10;
//         const skip = (page - 1) * limit;
//         const artistWithAlbums = await ArtistDetails.aggregate([
//             { $match: { id: Number(artist_id) } },
//             {
//                 $lookup: {
//                     from: 'artistalbumsandsongs',
//                     let: { artist_id: '$id' },
//                     pipeline: [
//                         {
//                             $match: {
//                                 $expr: { $eq: ['$artist_id', '$$artist_id'] }
//                             }
//                         },
//                         {
//                             $project: {
//                                 _id: 0,
//                                 song_link: 0
//                             }
//                         }
//                     ],
//                     as: 'albums'
//                 }
//             }
//         ]);
//         if (artistWithAlbums.length === 0) {
//             return successRes(res, 404, false, "Artist Not Found", []);
//         }
//         const [artist] = artistWithAlbums;
//         const { _id, artist_link, albums, ...artistDetails } = artist;

//         const totalAlbumsQuery = await ArtistAlbums.countDocuments({ artist_id: Number(artist_id) });

//         const totalPages = Math.ceil(totalAlbumsQuery / limit);

//         const paginatedAlbums = await ArtistAlbums.find({ artist_id: Number(artist_id) })
//             .skip(skip)
//             .limit(limit)
//             .select('-_id -song_link');

//         return successRes(res, 200, true, "Data Fetched successfully", {
//             ...artistDetails,
//             albums: paginatedAlbums,
//             currentPage: page,
//             totalPages
//         });
//     } catch (error) {
//         console.error('Error fetching artist albums:', error);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// };

module.exports.getSongsOfAlbums = async (req, res) => {
    try {
        const { album_name, page = 1, limit = 10 } = req.query;

        // Calculate the number of documents to skip
        const skip = (page - 1) * limit;

        // Query to count total documents matching the album_name
        const totalDocuments = await ArtistAlbums.countDocuments({ album_name });

        // Calculate total pages
        const totalPages = Math.ceil(totalDocuments / limit);

        // Query to get the paginated songs of the specified album_name
        const songs = await ArtistAlbums.find({ album_name })
            .skip(skip)
            .limit(limit)
            .select('-_id -artist_id -album_name');

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


module.exports.getArtiSongs = async (req, res) => {
    try {
        const { song_name, artist_name, page = 1, pageSize = 10 } = req.query;

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







