const userController = require('./userController')
const adminController = require('./adminController')
const lyricsController = require('./LyricsController')
const topChartController = require('./topChartController')

const controller = {
    userController,
    adminController,
    lyricsController,
    topChartController
}

module.exports = controller