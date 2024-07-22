const axios = require("axios");

//from spotify
module.exports.searchSongSpotify = async (req, res) => {
  const { type, query } = req.body;

  // Validate type parameter
  const validTypes = ["artist", "track", "album"];
  if (!validTypes.includes(type)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid search type" });
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to get access token" });
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
          limit: 50,
        },
      }
    );

    return res.status(200).json({ success: true, data: searchResponse.data });
  } catch (error) {
    console.error("Error searching Spotify API:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

//in this we will get all songs list of particular artist but isrc will not come in response so we will need to fetch isrc on particular track id
//from spotify
module.exports.artistSongSpotify = async (req, res) => {
  const { artistId, limit, offset } = req.query;

  if (!artistId) {
    return res
      .status(400)
      .json({ success: false, message: "Artist ID is required" });
  }

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
        // params: {
        //     include_groups: 'album',
        // }
      }
    );
    const albums = albumsResponse.data.items;
    let tracks = [];
    return res
      .status(200)
      .json({ success: true, data: albums, total: tracks.length });
  } catch (error) {
    console.error("Error fetching artist songs:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports.albumSongSpotify = async (req, res) => {
  try {
    const { albumId } = req.query;
    let tracks = [];
    let accessToken = await getAccessToken();
    await axios
      .get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((response) => {
        res.send(response.data.items);
      })
      .catch((error) => {
        console.log(error.response);
      });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};
