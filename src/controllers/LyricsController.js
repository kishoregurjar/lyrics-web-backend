const Admin = require("../models/adminModel");
const { catchRes, successRes, swrRes } = require("../utils/response");
const mongoose = require("mongoose");
const axios = require("axios");
const hotAlbmubModel = require("../models/hotAlbmubModel");
const topChartModel = require('../models/topChartModel')
const xml2js = require("xml2js");
const SpotifyWebApi = require('spotify-web-api-node');
const NodeCache = require('node-cache');

// access token for spotify
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

//by admin
// module.exports.addHotSong = async (req, res) => {
//     let { _id } = req.user;

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { isrcKey, status } = req.body;

//         const findAdmin = await Admin.findById(_id).session(session);
//         if (!findAdmin) {
//             await session.abortTransaction();
//             session.endSession();
//             return successRes(res, 401, false, "Admin Not Found");
//         }
//         const userAgent = req.headers['user-agent'] || 'YourAppName/1.0';
//         const territory = "IN";
//         const apiKey = process.env.LF_API_KEY;
//         const url = `https://api.lyricfind.com/lyric.do?apikey=${apiKey}&territory=${territory}&reqtype=default&trackid=isrc:${isrcKey}&output=json&useragent=${encodeURIComponent(userAgent)}`;

//         if (isrcKey == 'not-available') {
//             return successRes(res, 404, false, "Lyrics Not Found", null);
//         }

//         const response = await axios.get(url);
//         const { track, response: apiResponse } = response.data;

//         if (apiResponse.code !== 101) {
//             await session.abortTransaction();
//             session.endSession();
//             return successRes(res, 400, false, "Failed to fetch lyrics");
//         }
//         const albumData = {
//             lfid: track.lfid,
//             title: track.title,
//             artists: track.artist.name,
//             duration: (track.duration),
//             isrcs: track.isrcs[0],
//             has_lrc: track.has_lrc,
//             copyright: track.copyright,
//             writer: track.writer,
//         };
//         let saveResult;
//         if (status.includes('hotAlbum')) {
//             const newHotAlbum = new hotAlbmubModel(albumData);
//             saveResult = await newHotAlbum.save({ session });
//         }
//         if (status.includes('topChart')) {
//             const newTopChart = new topChartModel(albumData);
//             saveResult = await newTopChart.save({ session });
//         }

//         if (!saveResult) {
//             await session.abortTransaction();
//             session.endSession();
//             return swrRes(res);
//         }

//         await session.commitTransaction();
//         session.endSession();
//         return successRes(res, 201, true, "Song added successfully", albumData);
//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();
//         return catchRes(res, error);
//     }
// };

module.exports.addHotSong = async (req, res) => {
    let { _id } = req.user;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { isrcKey, status } = req.body;

        // Validate `status`
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

        console.log(albumData, "data")

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
        console.log(error.response)
        console.error("Error details:", error.response ? error.response.data : error.message);
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
    const { type, query, page = 1, limit = 10 } = req.body;

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

const myCache = new NodeCache({ stdTTL: 3600 }); // Cache data for 1 hour
const MAX_RETRIES = 5;

const makeRequestWithRetries = async (url, headers, retries = MAX_RETRIES, backoff = 1000) => {
    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 429 && retries > 0) {
            const retryAfter = error.response.headers['retry-after'] ? error.response.headers['retry-after'] * 1000 : backoff;
            console.log(`Rate limit exceeded. Retrying after ${retryAfter / 1000} seconds.`);
            await new Promise((resolve) => setTimeout(resolve, retryAfter));
            return makeRequestWithRetries(url, headers, retries - 1, backoff * 2); // Exponential backoff
        } else {
            throw error;
        }
    }
};


const fetchAlbums = async (artistId, limit, offset, accessToken) => {
    try {
        const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                limit: limit,
                offset: offset
            }
        });
        return response;
    } catch (error) {
        if (error.response && error.response.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return fetchAlbums(artistId, limit, offset, accessToken);
        }
        throw error;
    }
};

const fetchArtistAlbums = async (artistId, limit, offset, accessToken) => {
    const url = `https://api.spotify.com/v1/artists/${artistId}/albums?limit=${limit}&offset=${offset}`;
    const headers = {
        Authorization: `Bearer ${accessToken}`,
    };

    return makeRequestWithRetries(url, headers);
};

module.exports.artistSong = async (req, res) => {
    const { artistId, page } = req.query;
    const limit = 20;

    if (!artistId) {
        return successRes(res, 400, false, "Artist ID is required");
    }

    const limitValue = parseInt(limit, 10);
    const pageValue = page ? parseInt(page, 10) : 1;
    if (isNaN(limitValue) || limitValue <= 0) {
        return successRes(res, 400, false, "Invalid limit value");
    }

    if (isNaN(pageValue) || pageValue <= 0) {
        return successRes(res, 400, false, "Invalid page value");
    }

    const offset = (pageValue - 1) * limitValue;
    const cacheKey = `artist_${artistId}_page_${pageValue}`;

    const cachedData = myCache.get(cacheKey);
    console.log("nothing ", cachedData)
    if (cachedData) {
        console.log(cachedData, "data")
        return successRes(res, 200, true, "Artist Albums (from cache)", cachedData.albums);
    }

    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return res.status(500).json({ success: false, message: "Failed to get access token" });
        }

        const albumsResponse = await fetchArtistAlbums(artistId, limitValue, offset, accessToken);
        const albums = albumsResponse.items;
        const total = albumsResponse.total;

        myCache.set(cacheKey, { albums, total });

        return res.status(200).json({
            success: true,
            status: 200,
            data: albums,
            total,
            limit: limitValue,
            page: pageValue,
            totalPages: Math.ceil(total / limitValue),
            message: "Artist Albums Data"
        });
    } catch (error) {
        return catchRes(res, error);
    }
};

// module.exports.artistSong = async (req, res) => {
//     const { artistId, page } = req.query;
//     const limit = 20;

//     if (!artistId) {
//         return successRes(res, 400, false, "Artist ID is required");
//     }

//     const limitValue = parseInt(limit, 10);
//     const pageValue = page ? parseInt(page, 10) : 1; // Default to page 1 if not provided

//     if (isNaN(limitValue) || limitValue <= 0) {
//         return successRes(res, 400, false, "Invalid limit value");
//     }

//     if (isNaN(pageValue) || pageValue <= 0) {
//         return successRes(res, 400, false, "Invalid page value");
//     }

//     const offset = (pageValue - 1) * limitValue;

//     try {
//         const accessToken = await getAccessToken();
//         if (!accessToken) {
//             return res.status(500).json({ success: false, message: "Failed to get access token" });
//         }

//         const albumsResponse = await fetchAlbums(artistId, limitValue, offset, accessToken);
//         const albums = albumsResponse.data.items;
//         const total = albumsResponse.data.total;

//         return res.status(200).json({
//             success: true,
//             status: 200,
//             data: albums,
//             total,
//             limit: limitValue,
//             page: pageValue,
//             totalPages: Math.ceil(total / limitValue)
//         });
//     } catch (error) {
//         return catchRes(res, error);
//     }
// };

module.exports.getAlbumSong = async (req, res) => {
    try {
        const { albumId } = req.query;
        const cacheKey = `album_${albumId}`;

        // Check if the data is in the cache
        const cachedData = myCache.get(cacheKey);
        if (cachedData) {
            return successRes(res, 200, true, "Album Songs (from cache)", cachedData);
        }

        // Data is not in the cache, fetch from Spotify API
        const accessToken = await getAccessToken();
        const url = `https://api.spotify.com/v1/albums/${albumId}/tracks`;
        const headers = {
            Authorization: `Bearer ${accessToken}`,
        };

        const data = await makeRequestWithRetries(url, headers);

        // Cache the fetched data
        myCache.set(cacheKey, data.items);

        return successRes(res, 200, true, "Album Songs", data.items);
    } catch (error) {
        console.log(error.response || error);
        return successRes(res, 500, false, error.message, []);
    }
};


// module.exports.getAlbumSong = async (req, res) => {
//     try {
//         const { albumId } = req.query;
//         let accessToken = await getAccessToken();
//         await axios
//             .get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
//                 headers: {
//                     Authorization: `Bearer ${accessToken}`,
//                 },
//             })
//             .then((response) => {
//                 return successRes(res, 200, true, "Album Songs", response.data.items)
//             })
//             .catch((error) => {
//                 console.log(error.response);
//                 return successRes(res, 500, false, error.message, [])
//             });
//     } catch (error) {
//         return catchRes(res, error)
//     }
// };

module.exports.getArtistDetails = async (req, res) => {
    try {
        const artistId = req.query.artistId;

        const token = await getAccessToken();

        // Fetch artist details
        const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const artistData = artistResponse.data;

        // Fetch artist's top tracks
        const topTracksResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const topTracksData = topTracksResponse.data.tracks;
        const topTracks = topTracksData.map(track => track.name).slice(0, 2);

        const cleanTrackNames = topTracks.map(track => track.replace(/\"/g, ''));

        const description = `${artistData.name}, known professionally as ${artistData.name}, is a(n) ${artistData.genres.join(', ')} artist. They got big off of hits like "${cleanTrackNames[0]}" and "${cleanTrackNames[1]}". They are one of the current highest selling musicians and a big personality in the music industry.`;

        const enrichedArtistData = {
            ...artistData,
            description
        };

        return successRes(res, 200, true, "ArtistDetails", enrichedArtistData);
    } catch (error) {
        return catchRes(res, error);
    }
};

module.exports.getArtistsByLetter = async (req, res) => {
    try {
        const { letter, limit = 10, page = 1 } = req.body;
        const offset = limit * (page - 1);

        if (!letter || letter.length !== 1 || !/^[A-Z]$/i.test(letter)) {
            return res.status(400).json({ message: 'A single letter A-Z is required' });
        }

        const token = await getAccessToken();
        if (!token) {
            return res.status(500).json({ message: 'Failed to retrieve access token' });
        }

        let artists = [];
        let totalAvailable = 0;
        let totalFiltered = 0;
        let totalPages = 0;

        try {
            const response = await axios.get('https://api.spotify.com/v1/search', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    q: `${letter}*`,
                    type: 'artist',
                    limit: limit,
                    offset: offset
                }
            });

            artists = response.data.artists.items.filter(artist =>
                artist.name.toLowerCase().startsWith(letter.toLowerCase())
            ).map(artist => ({
                id: artist.id,
                name: artist.name,
                followers: artist.followers.total,
                images: artist.images
            }));

            totalAvailable = response.data.artists.total;
            totalFiltered = artists.length;
            totalPages = Math.ceil(totalAvailable / limit);

        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.error('Spotify API returned a 400 error:', error.response.data);
            } else {
                // Re-throw error if it's not a 400 error
                throw error;
            }
        }

        const data = {
            artists,
            pagination: {
                total: totalFiltered,
                totalAvailable,
                page,
                limit,
                totalPages,
                nextPage: offset + limit < totalAvailable ? page + 1 : null,
            }
        };

        return successRes(res, 200, true, "Artist Data", data);

    } catch (error) {
        console.error(error.stack);
        return catchRes(res, error);
    }
};


module.exports.getArtistSongs = async (req, res) => {
    try {
        const { artistId } = req.query;

        if (!artistId) {
            return res.status(400).json({ message: 'Artist ID is required' });
        }

        const token = await getAccessToken();
        if (!token) {
            return res.status(500).json({ message: 'Failed to retrieve access token' });
        }

        const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                limit: 5,
                include_groups: 'album,single'
            }
        });

        const albums = albumsResponse.data.items;
        const tracksPromises = albums.map(album =>
            axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
        );

        const tracksResponses = await Promise.all(tracksPromises);

        const tracks = tracksResponses.flatMap(response => response.data.items);

        const formattedTracks = tracks.map(track => ({
            id: track.id,
            name: track.name,
            album: track.name,
            duration: track.duration_ms,
            explicit: track.explicit,
            preview_url: track.preview_url,
            artists: track.artists.map(artist => ({
                id: artist.id,
                name: artist.name
            }))
        }));

        return successRes(res, 200, true, "Artist Songs Data", formattedTracks);

    } catch (error) {
        console.error(error.stack);
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

const spotifyApi = new SpotifyWebApi({
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
});


module.exports.albumDetails = async (req, res) => {
    const { albumId } = req.query;

    if (!albumId) {
        return res.status(400).json({ success: false, message: 'Album ID is required' });
    }

    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return res.status(500).json({ success: false, message: 'Failed to get access token' });
        }

        // const album = await fetchAlbum(albumId, accessToken);
        spotifyApi.setAccessToken(accessToken);

        const { body } = await spotifyApi.getAlbum(albumId);
        console.log(body, "data");

        return res.status(200).json({
            success: true,
            data: {
                name: body.name,
                release_date: body.release_date,
                images: body.images,
                description: body.description || 'No description available',
                tracks: body.tracks.items.map(track => ({
                    name: track.name,
                    duration: track.duration_ms,
                })),
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
