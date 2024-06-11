const express = require('express');
const controller = require('../controllers/indexController');
const { verifyUserToken } = require('../middlewares/authMiddleware');
const { validate, userSignupSchema, userLoginSchema, userEditSchema, userChangePasswordSchema, forgetPasswordSchema, userResetPasswordSchema, userFeedbackValidation } = require('../middlewares/userValidation');
const router = express.Router();

//======================= Auth ==============================/
router.post('/create-user', validate(userSignupSchema), controller.userController.createUser)
router.post('/login-user', validate(userLoginSchema), controller.userController.loginUser)
router.get('/user-profile', verifyUserToken, controller.userController.showUserProfile)
router.put('/verify-user', controller.userController.verifyUser)
router.put('/edit-user', validate(userEditSchema), verifyUserToken, controller.userController.editUserProfile)
router.put('/change-user-password', validate(userChangePasswordSchema), verifyUserToken, controller.userController.changePassword)
router.post('/forget-password', validate(forgetPasswordSchema), controller.userController.forgetPassword)
router.put('/reset-password', validate(userResetPasswordSchema), controller.userController.resetPassword)

//====================== Feedback ================================//

router.post('/submit-user-feedback', validate(userFeedbackValidation), controller.userController.submitFeedBack)

//===================== Testimonial ========================//

router.get('/get-testimonial', controller.userController.getTestimonial)

//===================== News ========================//
router.get("/get-news-list", controller.adminController.getNewsList);
router.get("/get-news", controller.adminController.getNewsById);

// ====================== Search Everything ====================//

router.post('/search', controller.lyricsController.searchSAA)
router.get('/artist/song', controller.lyricsController.artistSong)
router.post('/get-lyrics-user', controller.lyricsController.getLyricsUser)
router.get('/album/songs', controller.lyricsController.getAlbumSong)
router.post('/search-lyricfind', controller.lyricsController.searchLyricsFindSongs)

module.exports = router