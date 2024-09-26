const Admin = require("../models/adminModel");
const { catchRes, successRes, swrRes } = require("../utils/response");
const axios = require("axios");
const SpotifyWebApi = require('spotify-web-api-node');
const NodeCache = require('node-cache');
const ArtistBiblio = require("../models/artistBiblio");
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { default: mongoose } = require("mongoose");
const cache = new NodeCache({ stdTTL: 3600 });
const myCache = new NodeCache({ stdTTL: 3600 }); // Cache data for 1 hour
const MAX_RETRIES = 5;

/** ----- Generate spotify token ----- */

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

async function getAccessToken(retryCount = 0) {
  try {
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
  } catch (error) {
    if (error.response && error.response.status === 503 && retryCount < 3) {
      console.log(`Retrying... Attempt ${retryCount + 1}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount))); // Exponential backoff
      return getAccessToken(retryCount + 1);
    } else {
      console.error('Error fetching access token:', error.message);
      throw error;
    }
  }
}

// async function getAccessToken() {
//   try {
//     const token = Buffer.from(
//       `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
//     ).toString("base64");

//     const response = await axios.post(
//       "https://accounts.spotify.com/api/token",
//       "grant_type=client_credentials",
//       {
//         headers: {
//           Authorization: `Basic ${token}`,
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       }
//     );
//     return response.data.access_token;
//   } catch (error) {
//     console.log(error, "error")
//     if (error.response) {
//       console.error(`Error: ${error.response.status} - ${error.response.statusText}`);
//       console.error(error.response.data);
//       if (error.response.status === 503) {
//         console.error("Spotify API is unavailable. Please try again later.");
//       }
//     } else if (error.request) {
//       console.error("No response received from Spotify API.");
//       console.error(error.request);
//     } else {
//       console.error("Error in making the request to Spotify API.");
//       console.error(error.message);
//     }
//   }
// }

// async function getAccessToken() {
//   const token = Buffer.from(
//     `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
//   ).toString("base64");

//   const response = await axios.post(
//     "https://accounts.spotify.com/api/token",
//     "grant_type=client_credentials",
//     {
//       headers: {
//         Authorization: `Basic ${token}`,
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//     }
//   );

//   return response.data.access_token;
// }

/** ----- search for track,artist and albums from spotify ----- */
/**with Cache  */

module.exports.searchSAA = async (req, res) => {
  const { type, query, page = 1, limit = 10 } = req.body;

  let offset = limit * page - limit;

  const validTypes = ["artist", "track", "album"];
  if (!validTypes.includes(type)) {
    return successRes(res, 400, false, "Invalid Search Type", []);
  }

  try {
    const cacheKey = `${type}:${query}:${page}:${limit}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return successRes(res, 200, true, "Search List (Cached)", cachedData);
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return successRes(res, 500, false, "Failed to get access token", []);
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
          offset: offset,
        },
      }
    );

    const searchData = searchResponse.data;

    cache.set(cacheKey, searchData);

    return successRes(res, 200, true, "Search List", searchData);
  } catch (error) {
    return catchRes(res, error);
  }
};

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

const makeRequestWithRetries = async (url, headers, retries = MAX_RETRIES, backoff = 1000) => {
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429 && retries > 0) {
      const retryAfter = error.response.headers['retry-after']
        ? error.response.headers['retry-after'] * 1000
        : backoff;
      console.log(`Rate limit exceeded. Retry after ${retryAfter / 1000} seconds.`);
      return { retryAfter };  // Return the retryAfter time instead of retrying
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

/**with Cache  */
module.exports.artistAlbums = async (req, res) => {
  let { artistId, page } = req.query;
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
  if (cachedData) {
    return res.status(200).json({
      success: true,
      status: 200,
      data: cachedData.albums || [],
      total: cachedData.total,
      limit: cachedData.limit,
      page: cachedData.page,
      totalPages: cachedData.totalPages,
      message: "Artist Albums (from cache)"
    });
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(500).json({ success: false, message: "Failed to get access token" });
    }

    const albumsResponse = await fetchArtistAlbums(artistId, limitValue, offset, accessToken);
    const albums = albumsResponse.items;
    const total = albumsResponse.total;

    // Store all relevant data in the cache, including pagination info
    myCache.set(cacheKey, {
      albums,
      total,
      limit: limitValue,
      page: pageValue,
      totalPages: Math.ceil(total / limitValue)
    });

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


//if id is not provided
module.exports.artistAlbumsWithNameSearching = async (req, res) => {
  let { artistId, page } = req.query;
  const limit = 20;
  console.log(artistId, "artistId")
  if (!artistId) {
    return successRes(res, 400, false, "Artist ID is required");
  }

  if (artistId.length != 22) {
    artistId = await searchUsingArtistName(artistId)
    console.log(artistId, "11111111111")
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
  if (cachedData) {
    return res.status(200).json({
      success: true,
      status: 200,
      data: cachedData.albums || [],
      total: cachedData.total,
      limit: cachedData.limit,
      page: cachedData.page,
      totalPages: cachedData.totalPages,
      message: "Artist Albums (from cache)"
    });
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(500).json({ success: false, message: "Failed to get access token" });
    }

    const albumsResponse = await fetchArtistAlbums(artistId, limitValue, offset, accessToken);
    const albums = albumsResponse.items;
    const total = albumsResponse.total;

    // Store all relevant data in the cache, including pagination info
    myCache.set(cacheKey, {
      albums,
      total,
      limit: limitValue,
      page: pageValue,
      totalPages: Math.ceil(total / limitValue)
    });

    return res.status(200).json({
      success: true,
      status: 200,
      data: albums || [],
      total,
      limit: limitValue,
      page: pageValue,
      totalPages: Math.ceil(total / limitValue),
      message: "Artist Albums Data"
    });
  } catch (error) {
    console.log(error.message, "error")
    return catchRes(res, error);
  }
};


// module.exports.artistAlbums = async (req, res) => {
//   const { artistId, page } = req.query;
//   const limit = 20;

//   if (!artistId) {
//     return successRes(res, 400, false, "Artist ID is required");
//   }

//   const limitValue = parseInt(limit, 10);
//   const pageValue = page ? parseInt(page, 10) : 1;
//   if (isNaN(limitValue) || limitValue <= 0) {
//     return successRes(res, 400, false, "Invalid limit value");
//   }

//   if (isNaN(pageValue) || pageValue <= 0) {
//     return successRes(res, 400, false, "Invalid page value");
//   }

//   const offset = (pageValue - 1) * limitValue;
//   const cacheKey = `artist_${artistId}_page_${pageValue}`;

//   const cachedData = myCache.get(cacheKey);
//   if (cachedData) {
//     return successRes(res, 200, true, "Artist Albums (from cache)", cachedData.albums);
//   }

//   try {
//     const accessToken = await getAccessToken();
//     if (!accessToken) {
//       return res.status(500).json({ success: false, message: "Failed to get access token" });
//     }

//     const albumsResponse = await fetchArtistAlbums(artistId, limitValue, offset, accessToken);
//     const albums = albumsResponse.items;
//     const total = albumsResponse.total;

//     myCache.set(cacheKey, { albums, total });

//     return res.status(200).json({
//       success: true,
//       status: 200,
//       data: albums,
//       total,
//       limit: limitValue,
//       page: pageValue,
//       totalPages: Math.ceil(total / limitValue),
//       message: "Artist Albums Data"
//     });
//   } catch (error) {
//     return catchRes(res, error);
//   }
// };

/**with Cache  */
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
    return successRes(res, 500, false, error.message, []);
  }
};

/**with Cache  */

module.exports.getArtistDetails = async (req, res) => {
  try {
    const artistId = req.query.artistId;

    const cachedData = cache.get(artistId);
    if (cachedData) {
      return successRes(res, 200, true, "ArtistDetails (Cached)", cachedData);
    }

    const token = await getAccessToken();
    if (!token) {
      return successRes(res, 404, false, "Unable to get Spotify access token");
    }
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

    cache.set(artistId, enrichedArtistData);

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

module.exports.searchPageAPI = async (req, res) => {
  try {
    let { query } = req.query;

    if (!query) {
      return successRes(res, 400, false, "Query Parameter Required");
    }

    const token = await getAccessToken();
    if (!token) {
      return successRes(res, 500, false, "Failed to get access token", { artists: [], albums: [], tracks: [] })
    }
    const searchUrl = `https://api.spotify.com/v1/search`;
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const params = {
      q: query,
      type: 'artist,album,track',
      limit: 10,
    };

    const response = await axios.get(searchUrl, { headers, params });

    const artists = response?.data?.artists?.items;
    const albums = response?.data?.albums?.items;
    const tracks = response?.data?.tracks?.items;
    return successRes(res, 200, true, "All Data", { artists, albums, tracks })
  } catch (error) {
    return catchRes(res, error);
  }
};

// module.exports.uploadArtistDetails = async (req, res) => {
//   try {
//     const file = req.file;
//     const artistId = req.body.artistId; // Get artistId from request body

//     if (!file || !artistId) {
//       return res.status(400).json({ message: 'No file or artistId provided' });
//     }

//     const response = await ArtistBiblio.findOne({ artistId: artistId })
//     if (response) {
//       return successRes(res, 409, false, "Artist Details Already Addeds")
//     }

//     const results = [];

//     fs.createReadStream(file.path)
//       .pipe(csv())
//       .on('data', (row) => {
//         results.push(row);
//       })
//       .on('end', async () => {
//         try {
//           for (const row of results) {
//             if (!row.Artist || !row.bibliography) {
//               throw new Error('CSV structure is invalid');
//             }

//             const artistBiblio = new ArtistBiblio({
//               _id: new mongoose.Types.ObjectId(),
//               Artist: row.Artist,
//               bibliography: row.bibliography,
//               artistId: artistId
//             });

//             await artistBiblio.save();
//           }

//           return successRes(res, 200, true, "CSV processed and Saved Data successfully");
//         } catch (error) {
//           console.error('Error processing CSV data:', error);
//           return catchRes(res, error)
//         }
//       })
//       .on('error', (error) => {
//         return catchRes(res, error)
//       });

//   } catch (error) {
//     return catchRes(res, error)
//   }
// }

module.exports.uploadArtistDetails = async (req, res) => {
  try {
    const file = req.file;
    const artistId = req.body.artistId;

    if (!file || !artistId) {
      return res.status(400).json({ message: 'No file or artistId provided' });
    }

    const response = await ArtistBiblio.findOne({ artistId: artistId });
    if (response) {
      return successRes(res, 409, false, "Artist Details Already Added");
    }

    const results = [];

    fs.createReadStream(file.path, { encoding: 'utf8' })
      .pipe(csv())
      .on('data', (row) => {
        // Remove potential BOM from the "Artist" field
        if (row['﻿Artist']) {
          row.Artist = row['﻿Artist'].replace(/^\uFEFF/, ''); // Remove BOM if it exists
        }

        if (row.Artist && row.bibliography) {
          results.push(row);
        } else {
          throw new Error(`CSV structure is invalid: ${JSON.stringify(row)}`);
        }
      })
      .on('end', async () => {
        try {
          for (const row of results) {
            const artistBiblio = new ArtistBiblio({
              _id: new mongoose.Types.ObjectId(),
              Artist: row.Artist,
              bibliography: row.bibliography,
              artistId: artistId
            });

            await artistBiblio.save();
          }

          return successRes(res, 200, true, "CSV processed and saved data successfully");
        } catch (error) {
          console.error('Error processing CSV data:', error);
          return catchRes(res, error);
        }
      })
      .on('error', (error) => {
        return catchRes(res, error);
      });

  } catch (error) {
    return catchRes(res, error);
  }
};

const SONG_LIMIT = 80;

module.exports.songByArtist = async (req, res) => {
  const artistId = req.query.artistId;

  if (!artistId) {
    return successRes(res, 400, false, "Please Provide Artist ID");
  }

  try {
    const token = await getAccessToken();
    const albumsResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const albumIds = albumsResponse.data.items.map(album => album.id);

    let tracks = [];
    let allTracks = [];
    let offset = 0;

    for (const albumId of albumIds) {
      let hasMoreTracks = true;

      while (hasMoreTracks && tracks.length < SONG_LIMIT) {
        const tracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            offset: offset,
            limit: 50
          }
        });

        tracks = tracksResponse.data.items;
        allTracks = allTracks.concat(tracks);

        if (allTracks.length >= SONG_LIMIT) {
          allTracks = allTracks.slice(0, SONG_LIMIT);
          hasMoreTracks = false;
        } else if (tracksResponse.data.next) {
          offset += 50;
        } else {
          hasMoreTracks = false;
        }
      }

      if (allTracks.length >= SONG_LIMIT) break;
    }

    allTracks.sort((a, b) => a.name.localeCompare(b.name));

    return successRes(res, 200, true, "Songs Fetched successfully", allTracks || [])
  } catch (error) {
    return catchRes(res, error)
  }
};

const searchUsingArtistName = async (query) => {
  try {

    if (!query) {
      return successRes(res, 400, false, "Query Parameter Required");
    }

    const token = await getAccessToken();
    if (!token) {
      return successRes(res, 500, false, "Failed to get access token", [])
    }
    const searchUrl = `https://api.spotify.com/v1/search`;
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const params = {
      q: query,
      type: 'artist',
      limit: 1,
    };

    const response = await axios.get(searchUrl, { headers, params });

    // console.log(response.data.items, "response")
    // res.send(response.data.artists.items[0].id)
    console.log(response.data.artists.items[0].id, "artistIdddd")
    return response.data.artists.items[0].id
  } catch (error) {
    return catchRes(res, error);
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

