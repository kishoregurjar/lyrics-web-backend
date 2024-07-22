const userController = require("./userController");
const adminController = require("./adminController");
const lyricsController = require("./LyricsController");
const topChartController = require("./topChartController");
const artistController = require("./artistController");
const spotifyController = require("./spotifyController");

const controller = {
  userController,
  adminController,
  lyricsController,
  topChartController,
  artistController,
  spotifyController,
};

module.exports = controller;
