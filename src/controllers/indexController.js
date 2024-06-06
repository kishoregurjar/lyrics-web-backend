const userController = require('./userController')
const adminController = require('./adminController')
const lyricsController = require('./LyricsController')

const controller = {
    userController,
    adminController,
    lyricsController
}

module.exports = controller