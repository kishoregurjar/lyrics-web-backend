const Admin = require("../models/adminModel");
const { catchRes, successRes, swrRes } = require("../utils/response");
const mongoose = require("mongoose");
const axios = require("axios");
const hotAlbmubModel = require("../models/hotAlbmubModel");
const topChartModel = require('../models/topChartModel')
const xml2js = require("xml2js");
const ArtistBiblio = require('../models/artistBiblio');
const actualHotAlbumModel = require("../models/actualHotAlbumModel");


//by admin

/**

module.exports.addHotSong = async (req, res) => {
    let { _id } = req.user;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { isrcKey, status } = req.body;

        const findAdmin = await Admin.findById(_id).session(session);
        if (!findAdmin) {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 401, false, "Admin Not Found");
        }
        const userAgent = req.headers['user-agent'] || 'YourAppName/1.0';
        const territory = "IN";
        const apiKey = process.env.LF_API_KEY;
        const url = `https://api.lyricfind.com/lyric.do?apikey=${apiKey}&territory=${territory}&reqtype=default&trackid=isrc:${isrcKey}&output=json&useragent=${encodeURIComponent(userAgent)}`;

        if (isrcKey == 'not-available') {
            return successRes(res, 404, false, "Lyrics Not Found", null);
        }

        const response = await axios.get(url);
        const { track, response: apiResponse } = response.data;

        if (apiResponse.code !== 101) {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 400, false, "Failed to fetch lyrics");
        }
        const albumData = {
            lfid: track.lfid,
            title: track.title,
            artists: track.artist.name,
            duration: (track.duration),
            isrcs: track.isrcs[0],
            has_lrc: track.has_lrc,
            copyright: track.copyright,
            writer: track.writer,
        };
        let saveResult;
        if (status.includes('hotAlbum')) {
            const newHotAlbum = new hotAlbmubModel(albumData);
            saveResult = await newHotAlbum.save({ session });
        }
        if (status.includes('topChart')) {
            const newTopChart = new topChartModel(albumData);
            saveResult = await newTopChart.save({ session });
        }

        if (!saveResult) {
            await session.abortTransaction();
            session.endSession();
            return swrRes(res);
        }

        await session.commitTransaction();
        session.endSession();
        return successRes(res, 201, true, "Song added successfully", albumData);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return catchRes(res, error);
    }
};

 */

module.exports.addHotSong = async (req, res) => {
    let { _id } = req.user;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { isrcKey, status } = req.body;

        if (!status || (typeof status !== 'string' && !Array.isArray(status))) {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 400, false, "Invalid status format");
        }

        const findAdmin = await Admin.findById(_id).session(session);
        if (!findAdmin) {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 401, false, "Admin Not Found");
        }

        const spotifyToken = await getAccessToken();
        if (!spotifyToken) {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 500, false, "Failed to obtain Spotify token");
        }

        const url = `https://api.spotify.com/v1/tracks/${isrcKey}`;
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });
        const track = response.data;

        const albumData = {
            spotifyId: track.id,
            title: track.name,
            artists: track.artists.map(artist => artist.name).join(', '),
            duration: track.duration_ms,
            isrc: track.external_ids.isrc,
            album: track.album.name,
            releaseDate: track.album.release_date,
            image: track.album.images[0]?.url
        };


        let saveResult;
        if (Array.isArray(status)) {
            if (status.includes('hotAlbum')) {
                const newHotAlbum = new hotAlbmubModel(albumData);
                saveResult = await newHotAlbum.save({ session });
            }
            if (status.includes('topChart')) {
                const newTopChart = new topChartModel(albumData);
                saveResult = await newTopChart.save({ session });
            }
        } else if (typeof status === 'string') {
            if (status.includes('hotAlbum')) {
                const newHotAlbum = new hotAlbmubModel(albumData);
                saveResult = await newHotAlbum.save({ session });
            }
            if (status.includes('topChart')) {
                const newTopChart = new topChartModel(albumData);
                saveResult = await newTopChart.save({ session });
            }
        }

        if (!saveResult) {
            await session.abortTransaction();
            session.endSession();
            return swrRes(res);
        }

        await session.commitTransaction();
        session.endSession();
        return successRes(res, 201, true, "Song added successfully", albumData);
    } catch (error) {
        console.error("Error details:", error.response ? error.response.data : error.message);
        await session.abortTransaction();
        session.endSession();
        return catchRes(res, error);
    }
};

module.exports.addHotAlbums = async (req, res) => {
    let { _id } = req.user;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { albumId, status } = req.body;

        // Validate status
        if (!status || status !== 'hotAlbum') {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 400, false, "Invalid status, only 'hotAlbum' is allowed");
        }

        // Validate albumId
        if (!albumId) {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 400, false, "albumId is required for hotAlbum");
        }

        const findAdmin = await Admin.findById(_id).session(session);
        if (!findAdmin) {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 401, false, "Admin Not Found");
        }

        const checkAlreadyAlbum = await actualHotAlbumModel.find({ albumId })
        console.log(checkAlreadyAlbum, "1111111111")
        if (checkAlreadyAlbum.length > 0) {
            return successRes(res, 409, false, "Album Already exists")
        }

        // Get Spotify access token
        const spotifyToken = await getAccessToken();
        if (!spotifyToken) {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 500, false, "Failed to obtain Spotify token");
        }

        // Fetch album data from Spotify using albumId
        const albumResponse = await axios.get(`https://api.spotify.com/v1/albums/${albumId}`, {
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });

        const album = albumResponse.data;

        // Prepare album data
        const albumData = {
            albumId: album.id,
            title: album.name,
            artists: album.artists.map(artist => artist.name).join(', '),
            releaseDate: album.release_date,
            totalTracks: album.total_tracks,
            image: album.images[0]?.url
        };

        // Save hotAlbum data
        const newHotAlbum = new actualHotAlbumModel(albumData);
        await newHotAlbum.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();
        return successRes(res, 201, true, "Hot album added successfully", albumData);
    } catch (error) {
        console.error("Error details:", error.response ? error.response.data : error.message);
        await session.abortTransaction();
        session.endSession();
        return catchRes(res, error);
    }
};

module.exports.getActualHotAlbum = async (req, res) => {
    try {
        const hotAlbum = await actualHotAlbumModel.find()
            .sort({ createdAt: -1 })
        return successRes(res, 200, true, "Hot Albums", hotAlbum)
    } catch (error) {
        return catchRes(res, error)
    }
}


module.exports.getHotSongList = async (req, res) => {
    try {
        let { _id } = req.user;
        const findAdmin = await Admin.findById(_id);
        if (!findAdmin) {
            return successRes(res, 401, false, "Admin Not Found");
        }

        const findHotSongs = await hotAlbmubModel.find().sort({ createdAt: -1 });
        if (!findHotSongs) {
            return successRes(res, 200, false, "Empty Hot Song List", []);
        }
        return successRes(res, 200, true, "Hot Song List", findHotSongs);
    } catch (error) {
        return catchRes(res, error);
    }
};

module.exports.deleteHotSong = async (req, res) => {
    const { _id } = req.user;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { hotAlbumId } = req.query;

        const findAdmin = await Admin.findById(_id).session(session);
        if (!findAdmin) {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 401, false, "Admin Not Found");
        }

        const findAndDeleteSong = await hotAlbmubModel.findOneAndDelete({
            _id: hotAlbumId,
        });
        if (!findAndDeleteSong) {
            await session.abortTransaction();
            session.endSession();
            return swrRes(res);
        }

        await session.commitTransaction();
        session.endSession();
        return successRes(res, 200, true, "Album Deleted Successfully", null);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return catchRes(res, error);
    }
};

// =====================================Lyrics Find Apis=======================================================

//with pagijnation

module.exports.searchLyricsFindSongs = async (req, res) => {
    const { type = 'track', query, page = 1, limit = 10 } = req.body;

    const validTypes = ["artist", "track", "album"];
    if (!validTypes.includes(type)) {
        return res
            .status(400)
            .json({ success: false, message: "Invalid search type" });
    }
    const offset = page * limit - limit
    let apiUrl = "";
    if (type === "track") {
        apiUrl = `https://api.lyricfind.com/search.do?apikey=aa7b666eab90a0994641e90bf02dd18b&territory=IN&reqtype=default&searchtype=track&lyrics=${query}&page=${page}&limit=${limit}&offset=${offset}`;
    } else if (type === "artist") {
        apiUrl = `https://api.lyricfind.com/search.do?reqtype=default&apikey=aa7b666eab90a0994641e90bf02dd18b&territory=IN&searchtype=track&artist=${query}&page=${page}&limit=${limit}&offset=${offset}`;
    } else if (type === "album") {
        apiUrl = `https://api.lyricfind.com/search.do?reqtype=default&apikey=aa7b666eab90a0994641e90bf02dd18b&territory=IN&searchtype=track&album=${query}&page=${page}&limit=${limit}&offset=${offset}`;
    }

    try {
        const searchResponse = await axios.get(apiUrl);

        xml2js.parseString(
            searchResponse.data,
            { explicitArray: false },
            (err, result) => {
                if (err) {
                    console.error("Error parsing XML:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Error parsing response from API",
                    });
                }

                const totalResults = parseInt(result?.lyricfind?.tracks?.$?.totalresults, 10);
                const totalPages = Math.ceil(totalResults / limit);
                const currentPage = parseInt(page, 10);

                const pagination = {
                    totalResults,
                    totalPages,
                    currentPage,
                    limit,
                };

                return res.status(200).json({
                    success: true,
                    status: 200,
                    message: "Search Results",
                    pagination,
                    data: result
                });
            }
        );
    } catch (error) {
        return catchRes(res, error)
    }
}

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

async function getAccessToken() {
    const token = Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        "grant_type=client_credentials",
        {
            headers: {
                Authorization: `Basic ${token}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    return response.data.access_token;
}

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

async function getISRCFromSpotify(trackId) {
    try {
        const accessToken = await getAccessToken();

        const response = await axios.get(`${SPOTIFY_API_URL}/tracks/${trackId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        return response.data.external_ids.isrc;
    } catch (error) {
        console.error('Error fetching ISRC from Spotify:', error.message);
        throw new Error('Unable to fetch ISRC');
    }
}

module.exports.getLyricsAdmin = async (req, res) => {
    try {
        let { isrcKey } = req.body;
        const territory = "IN";
        const apiKey = process.env.LF_API_KEY;
        const userAgent = req.headers['user-agent'] || 'YourAppName/1.0';

        if (isrcKey.length == 22) {
            isrcKey = await getISRCFromSpotify(isrcKey);
        }

        const url = `https://api.lyricfind.com/lyric.do?apikey=${apiKey}&territory=${territory}&reqtype=default&trackid=isrc:${isrcKey}&output=json&useragent=${encodeURIComponent(userAgent)}`;

        if (isrcKey === 'not-available') {
            return successRes(res, 200, false, "Lyrics Not Found", null);
        }

        const response = await axios.get(url);

        if (response?.data?.response?.code === 206) {
            return successRes(res, 200, false, "Lyrics Not Found", null);
        }

        let resObj = {};
        if (response?.data?.response?.code === 204 || response?.data?.response?.code === 202) {
            return successRes(res, 200, false, "Lyrics Not Found", null);
        } else if (response && response.data && response.data.track) {
            resObj = response.data.track;
            return successRes(res, 200, true, "Lyrics Fetched Successfully", resObj);
        } else {
            return res.status(500).send({ error: "Unexpected response format from lyrics API" });
        }
    } catch (error) {
        return catchRes(res, error)
    }
};

module.exports.artistDetailsByDB = async (req, res) => {
    try {
        let { artistId } = req.query;
        if (!artistId) {
            return successRes(res, 400, false, "Please Provide Artist id")
        }
        let findArtistDetails = await ArtistBiblio.find({ artistId: artistId })
        if (!findArtistDetails) {
            return successRes(res, 200, false, "No artist details", []);
        }
        return successRes(res, 200, true, "Artist Details Fetched Successfully", findArtistDetails)

    } catch (error) {
        return catchRes(res, error)
    }
}

module.exports.deleteActualHotAlbum = async (req, res) => {
    try {
        const { albumId } = req.query;
        if (!albumId) {
            return successRes(res, 400, false, "Please Provide Album id")
        }
        const album = await actualHotAlbumModel.find({ albumId: albumId });
        if (!album) {
            return successRes(res, 404, false, "Album Not Found", null);
        }
        await actualHotAlbumModel.deleteOne({ albumId: albumId });
        return successRes(res, 200, true, "Album Deleted Successfully", null);
    } catch (error) {
        return catchRes(res, error)
    }
}
