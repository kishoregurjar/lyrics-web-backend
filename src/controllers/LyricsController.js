const Admin = require("../models/adminModel");
const { catchRes, successRes, swrRes } = require("../utils/response");
const mongoose = require("mongoose");
const axios = require('axios');
const hotAlbmubModel = require("../models/hotAlbmubModel");
const xml2js = require('xml2js');

async function getAccessToken() {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
    console.log(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)
    const token = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        headers: {
            'Authorization': `Basic ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    return response.data.access_token;
}

module.exports.addHotSong = async (req, res) => {
    let { _id } = req.user;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { isrcKey } = req.body;

        const findAdmin = await Admin.findById(_id).session(session);
        if (!findAdmin) {
            await session.abortTransaction();
            session.endSession();
            return successRes(res, 401, false, "Admin Not Found");
        }

        const checkLimit = await hotAlbmubModel.find().count();
        if (checkLimit >= 8) {
            return successRes(res, 400, false, "Can not add more than 8 Hot songs");
        }

        const accessToken = await getAccessToken();
        if (!accessToken) {
            await session.abortTransaction();
            session.endSession();
            return swrRes(res);
        }

        const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                q: `isrc:${isrcKey}`,
                type: 'track',
                limit: 1
            }
        });

        if (searchResponse.data.tracks.items.length === 0) {
            return successRes(res, 404, false, "Track Not Found");
        }

        const track = searchResponse.data.tracks.items[0];
        const territory = track.available_markets ? track.available_markets.join(', ') : 'Unknown';

        const newHotAlbum = new hotAlbmubModel({
            images: track.album.images.map(image => image.url),
            name: track.name,
            releaseDate: track.album.release_date,
            artists: track.artists.map(artist => artist.name),
            isrc: track.external_ids.isrc,
            album: track.album.name,
            genre: track.album.genres ? track.album.genres.join(', ') : 'Unknown',
            duration: track.duration_ms,
            spotifyUrl: track.external_urls.spotify,
            territory: territory  // Added territory field
        });

        let saveAlbum = await newHotAlbum.save();
        if (!saveAlbum) {
            await session.abortTransaction();
            session.endSession();
            return swrRes(res);
        }

        await session.commitTransaction();
        session.endSession();
        return successRes(res, 201, true, 'Hot song added successfully', newHotAlbum);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return catchRes(res, error);
    }
};


module.exports.getHotSongList = async (req, res) => {
    try {
        let { _id } = req.user;
        const findAdmin = await Admin.findById(_id)
        if (!findAdmin) {
            return successRes(res, 401, false, "Admin Not Found");
        }

        const findHotSongs = await hotAlbmubModel.find().sort({ createdAt: -1 });

        if (!findHotSongs) {
            return successRes(res, 200, false, "Empty Hot Song List", [])
        }
        return successRes(res, 200, true, "Hot Song List", findHotSongs)
    } catch (error) {
        return catchRes(res, error);
    }
}

module.exports.deleteHotSong = async (req, res) => {
    const { _id } = req.user
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

        const findAndDeleteSong = await hotAlbmubModel.findOneAndDelete({ _id: hotAlbumId })
        if (!findAndDeleteSong) {
            await session.abortTransaction();
            session.endSession();
            return swrRes(res);
        }

        await session.commitTransaction();
        session.endSession();
        return successRes(res, 200, true, "Album Deleted Successfully", null)
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return catchRes(res, error);
    }
}

//for admin panel
module.exports.searchSong = async (req, res) => {
    try {
        const { query } = req.query;

        const accessToken = await getAccessToken();
        if (!accessToken) {
            return res.status(500).json({ error: 'Failed to retrieve access token' });
        }

        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                q: query,
                type: 'track',
                limit: 10
            }
        });

        const tracks = response.data.tracks.items.map(track => ({
            name: track.name,
            id: track.id,
            isrc: track.external_ids.isrc,
            artist: track.artists[0].name,
            image: track.album.images.length > 0 ? track.album.images[0].url : null
        }));

        if (!tracks) {
            return successRes(res, 404, false, "No songs found", [])
        }
        return successRes(res, 200, true, "Songs Lists", tracks)

    } catch (error) {
        return catchRes(res, error);
    }
};

module.exports.getLyricsAdmin = async (req, res) => {
    try {
        const { isrcKey } = req.body;
        const territory = 'IN'
        const apiKey = process.env.LF_API_KEY || '5f99ebb429f9d2b9e13998f93943b34a'; // Use environment variable
        const url = `https://api.lyricfind.com/lyric.do?apikey=${apiKey}&territory=${territory}&reqtype=default&trackid=isrc:${isrcKey}`;

        console.log(url, "url")

        const response = await axios.get(url);
        const xmlData = response.data;
        // console.log(xmlData)

        const parser = new xml2js.Parser();
        const jsonData = await parser.parseStringPromise(xmlData);

        if (!jsonData || !jsonData.lyricfind || !jsonData.lyricfind.track || jsonData.lyricfind.track.length === 0) {
            return successRes(res, 404, false, "No Lyrics Found", null)
        }

        const track = jsonData.lyricfind.track[0];
        let lyrics = track.lyrics[0];

        const resObj = {
            title: track?.title[0],
            artist: track?.artists[0].artist[0]["_"],
            lyrics: lyrics
        };

        return successRes(res, 200, true, "Lyrics fectched Successfully", resObj)

    } catch (error) {
        console.error('Error fetching song details:', error.message);
        res.status(500).send({ error: error.message });
    }
};

module.exports.searchSAA = async (req, res) => {
    const { type, query } = req.body;

    // Validate type parameter
    const validTypes = ['artist', 'track', 'album'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid search type' });
    }

    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return res.status(500).json({ success: false, message: 'Failed to get access token' });
        }

        const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                q: query,
                type: type,
                limit: 50
            }
        });

        return res.status(200).json({ success: true, data: searchResponse.data });

    } catch (error) {
        console.error('Error searching Spotify API:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

//in this we will get all songs list of particular artist but isrc will not come in response so we will need to fetch isrc on particular track id
module.exports.artistSong = async (req, res) => {
    const { artistId, limit, offset } = req.query;

    if (!artistId) {
        return res.status(400).json({ success: false, message: 'Artist ID is required' });
    }

    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            return res.status(500).json({ success: false, message: 'Failed to get access token' });
        }

        const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            // params: {
            //     include_groups: 'album',
            // }
        });

        const albums = albumsResponse.data.items;
        console.log(albumsResponse.data.items)

        let tracks = [];
        // for (const album of albums) {
        //     const albumTracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
        //         headers: {
        //             'Authorization': `Bearer ${accessToken}`
        //         },
        //         params: {
        //             limit: limit || 10, // Default limit to 10 if not provided
        //             offset: offset || 0 // Default offset to 0 if not provided
        //         }
        //     });
        //     tracks = tracks.concat(albumTracksResponse.data.items);
        // }

        return res.status(200).json({ success: true, data: albums, total: tracks.length });

    } catch (error) {
        console.error('Error fetching artist songs:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

module.exports.getLyricsUser = async (req, res) => {
    try {
        const { key } = req.body;
        let isrcKey;
        if (key.length == 22) {
            isrcKey = await getISRC(key)
        } else {
            isrcKey = key
        }
        console.log(isrcKey, "isrckey")
        const territory = 'IN'
        const apiKey = process.env.LF_API_KEY || '5f99ebb429f9d2b9e13998f93943b34a'; // Use environment variable
        const url = `https://api.lyricfind.com/lyric.do?apikey=${apiKey}&territory=${territory}&reqtype=default&trackid=isrc:${isrcKey}`;

        console.log(url, "url")

        const response = await axios.get(url);
        const xmlData = response.data;
        console.log(xmlData)

        const parser = new xml2js.Parser();
        const jsonData = await parser.parseStringPromise(xmlData);

        if (!jsonData || !jsonData.lyricfind || !jsonData.lyricfind.track || jsonData.lyricfind.track.length === 0) {
            return successRes(res, 404, false, "No Lyrics Found", null)
        }

        const track = jsonData.lyricfind.track[0];
        let lyrics = track.lyrics[0];

        const resObj = {
            title: track?.title[0],
            artist: track?.artists[0].artist[0]["_"],
            lyrics: lyrics
        };

        return successRes(res, 200, true, "Lyrics fectched Successfully", resObj)

    } catch (error) {
        console.error('Error fetching song details:', error.message);
        res.status(500).send({ error: error.message });
    }
};

const getISRC = async (trackId) => {
    const accessToken = await getAccessToken();
    const trackUrl = `https://api.spotify.com/v1/tracks/${trackId}`;
    const response = await axios.get(trackUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    return response.data.external_ids.isrc;
}

module.exports.getAlbumSong = async (req, res) => {
    try {
        const { albumId } = req.query
        console.log(albumId, "111111111")
        let tracks = [];
        let accessToken = await getAccessToken();
        console.log(accessToken)
        await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }).then((response) => {
            console.log(response.data.items, "response")
            res.send(response.data.items)
        }).catch(error => {
            console.log(error.response)
        })
        // console.log(albumTracksResponse, "hello")
        // tracks = tracks.concat(albumTracksResponse.data.items);
        // res.send(tracks)
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}

// =====================================Lyrics Find Apis=======================================================

//for user
module.exports.searchLyricsFindSongs = async (req, res) => {
    const { type, query } = req.body;
    console.log(type, query)

    const validTypes = ['artist', 'track', 'album'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, message: 'Invalid search type' });
    }

    try {
        const searchResponse = await axios.get(`https://api.lyricfind.com/search.do?apikey=9d2330933c7ca5d0c36aa228f372d87b&territory=IN&reqtype=default&searchtype=${type}&lyrics=${query}`);

        xml2js.parseString(searchResponse.data, { explicitArray: false }, (err, result) => {
            if (err) {
                console.error('Error parsing XML:', err);
                return res.status(500).json({ success: false, message: 'Error parsing response from API' });
            }

            return res.status(200).json({ success: true, data: result });
        });

    } catch (error) {
        console.error('Error searching LyricFind API:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}



