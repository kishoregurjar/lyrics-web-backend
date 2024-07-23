const Admin = require("../models/adminModel");
const { catchRes, successRes, swrRes } = require("../utils/response");
const mongoose = require("mongoose");
const axios = require("axios");
const hotAlbmubModel = require("../models/hotAlbmubModel");
const topChartModel = require('../models/topChartModel')
const xml2js = require("xml2js");

// access token for spotify
async function getAccessToken() {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
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

//by admin
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
        console.log(response, "1111111111")
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

//for admin panel from spotify
module.exports.searchSong = async (req, res) => {
    try {
        const { query } = req.query;

        const accessToken = await getAccessToken();
        if (!accessToken) {
            return res.status(500).json({ error: "Failed to retrieve access token" });
        }

        const response = await axios.get("https://api.spotify.com/v1/search", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                q: query,
                type: "track",
                limit: 10,
            },
        });

        const tracks = response.data.tracks.items.map((track) => ({
            name: track.name,
            id: track.id,
            isrc: track.external_ids.isrc,
            artist: track.artists[0].name,
            image: track.album.images.length > 0 ? track.album.images[0].url : null,
        }));

        if (!tracks) {
            return successRes(res, 404, false, "No songs found", []);
        }
        return successRes(res, 200, true, "Songs Lists", tracks);
    } catch (error) {
        return catchRes(res, error);
    }
};

//from spotify
module.exports.searchSAA = async (req, res) => {
    const { type, query, page = 1 } = req.body;
    const limit = 10;
    let offset = limit * page - limit

    const validTypes = ["artist", "track", "album"];
    if (!validTypes.includes(type)) {
        return successRes(res, 400, false, "Invalid Search Type", [])
    }

    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return successRes(res, 500, false, "Failed to get access token", [])
        }

        const searchResponse = await axios.get(
            "https://api.spotify.com/v1/search",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: {
                    q: query,
                    type: type,
                    limit: limit,
                    offset: offset
                },
            }
        );

        return successRes(res, 200, true, "Search List", searchResponse.data)
    } catch (error) {
        return catchRes(res, error)
    }
};

//in this we will get all songs list of particular artist but isrc will not come in response so we will need to fetch isrc on particular track id
//from spotify
// module.exports.artistSong = async (req, res) => {
//     const { artistId } = req.query;

//     if (!artistId) {
//         return res.status(400).json({ success: false, message: "Artist ID is required" });
//     }

//     try {
//         const accessToken = await getAccessToken();
//         if (!accessToken) {
//             return res
//                 .status(500)
//                 .json({ success: false, message: "Failed to get access token" });
//         }
//         const albumsResponse = await axios.get(
//             `https://api.spotify.com/v1/artists/${artistId}/albums`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${accessToken}`,
//                 },
//             }
//         );
//         const albums = albumsResponse.data.items;
//         let tracks = [];
//         return res.status(200).json({ success: true, data: albums, total: tracks.length });
//     } catch (error) {
//         console.error("Error fetching artist songs:", error);
//         return res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
// };

module.exports.artistSong = async (req, res) => {
    const { artistId, limit = 20, page = 1 } = req.query;

    if (!artistId) {
        return successRes(res, 400, false, "Artist ID is required")
    }

    const limitValue = parseInt(limit, 10);
    const pageValue = parseInt(page, 10);

    if (isNaN(limitValue) || limitValue <= 0) {
        return successRes(res, 400, false, "Invalid limit value");
    }

    if (isNaN(pageValue) || pageValue <= 0) {
        return successRes(res, 400, false, "Invalid page value");
    }

    const offset = (pageValue - 1) * limitValue;

    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return res
                .status(500)
                .json({ success: false, message: "Failed to get access token" });
        }

        const albumsResponse = await axios.get(
            `https://api.spotify.com/v1/artists/${artistId}/albums`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: {
                    limit: limitValue,
                    offset: offset
                }
            }
        );

        const albums = albumsResponse.data.items;
        const total = albumsResponse.data.total;

        return res.status(200).json({
            success: true,
            data: albums,
            total,
            limit: limitValue,
            page: pageValue,
            totalPages: Math.ceil(total / limitValue)
        });
    } catch (error) {
        return catchRes(res, error)
    }
};

module.exports.getAlbumSong = async (req, res) => {
    try {
        const { albumId } = req.query;
        let accessToken = await getAccessToken();
        await axios
            .get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })
            .then((response) => {
                return successRes(res, 200, true, "Album Songs", response.data.items)
            })
            .catch((error) => {
                console.log(error.response);
            });
    } catch (error) {
        return catchRes(res, error)
    }
};

// =====================================Lyrics Find Apis=======================================================

//with pagijnation

module.exports.searchLyricsFindSongs = async (req, res) => {
    const { type = 'track', query, page = 1, limit = 10 } = req.body;
    console.log(query, "query");

    const validTypes = ["artist", "track", "album"];
    if (!validTypes.includes(type)) {
        return res
            .status(400)
            .json({ success: false, message: "Invalid search type" });
    }
    const offset = page * limit - limit
    console.log(offset, "offset")
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
            return successRes(res, 404, false, "Lyrics Not Found", null);
        }

        const response = await axios.get(url);

        if (response?.data?.response?.code === 206) {
            return successRes(res, 404, false, "Lyrics Not Found", null);
        }

        let resObj = {};

        if (response?.data?.response?.code === 204) {
            return successRes(res, 404, false, "Lyrics Not Found", null);
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
