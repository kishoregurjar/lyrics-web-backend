const Admin = require("../models/adminModel");
const { catchRes, successRes, swrRes } = require("../utils/response");
const axios = require("axios");
const SpotifyWebApi = require('spotify-web-api-node');
const NodeCache = require('node-cache');

/** ----- Generate spotify token ----- */

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

/** ----- search for track,artist and albums from spotify ----- */
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

/** function to fetch albumbs for artistAlbums API */

const fetchArtistAlbums = async (artistId, limit, offset, accessToken) => {
  const url = `https://api.spotify.com/v1/artists/${artistId}/albums?limit=${limit}&offset=${offset}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  return makeRequestWithRetries(url, headers);
};

module.exports.artistAlbums = async (req, res) => {
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

module.exports.getAlbumSong = async (req, res) => {
  try {
    const { albumId } = req.query;
    const cacheKey = `album_${albumId}`;

    const cachedData = myCache.get(cacheKey);
    if (cachedData) {
      return successRes(res, 200, true, "Album Songs (from cache)", cachedData);
    }

    const accessToken = await getAccessToken();
    const url = `https://api.spotify.com/v1/albums/${albumId}/tracks`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const data = await makeRequestWithRetries(url, headers);

    myCache.set(cacheKey, data.items);

    return successRes(res, 200, true, "Album Songs", data.items);
  } catch (error) {
    console.log(error.response || error);
    return successRes(res, 500, false, error.message, []);
  }
};


module.exports.getArtistDetails = async (req, res) => {
  try {
    const artistId = req.query.artistId;

    const token = await getAccessToken();

    const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const artistData = artistResponse.data;

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

/**
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
 */

/** 
module.exports.artistSong = async (req, res) => {
    const { artistId, page } = req.query;
    const limit = 20;

    if (!artistId) {
        return successRes(res, 400, false, "Artist ID is required");
    }

    const limitValue = parseInt(limit, 10);
    const pageValue = page ? parseInt(page, 10) : 1; // Default to page 1 if not provided

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
            return res.status(500).json({ success: false, message: "Failed to get access token" });
        }

        const albumsResponse = await fetchAlbums(artistId, limitValue, offset, accessToken);
        const albums = albumsResponse.data.items;
        const total = albumsResponse.data.total;

        return res.status(200).json({
            success: true,
            status: 200,
            data: albums,
            total,
            limit: limitValue,
            page: pageValue,
            totalPages: Math.ceil(total / limitValue)
        });
    } catch (error) {
        return catchRes(res, error);
    }
};

*/

/**
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
                return successRes(res, 500, false, error.message, [])
            });
    } catch (error) {
        return catchRes(res, error)
    }
};

 */

