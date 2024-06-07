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
        const { hotAlbumId } = req.body;

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

        res.json(tracks);
    } catch (error) {
        return catchRes(res, error);
    }
};

module.exports.getLyricsAdmin = async (req, res) => {
    try {
        console.log(req.user)
        const { isrcKey } = req.params;
        console.log(isrcKey, req.params, "111111111")
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
            throw new Error('Invalid response from LyricFind API');
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





