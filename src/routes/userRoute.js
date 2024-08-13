const express = require("express");
const controller = require("../controllers/indexController");
const { verifyUserToken } = require("../middlewares/authMiddleware");
const {
  validate,
  userSignupSchema,
  userLoginSchema,
  userEditSchema,
  userChangePasswordSchema,
  forgetPasswordSchema,
  userResetPasswordSchema,
  userFeedbackValidation,
  userCommentValidation,
} = require("../middlewares/userValidation");
const { uploadUserAvatar } = require("../utils/multer");
const router = express.Router();

//======================= Auth ==============================/
router.post('/is-authorized', controller.userController.isAuthorized)
router.post("/create-user", validate(userSignupSchema), controller.userController.createUser);
router.post("/login-user", validate(userLoginSchema), controller.userController.loginUser);
router.post("/upload-profile-picture", uploadUserAvatar, controller.userController.uploadProfilePicture);
router.get("/user-profile", verifyUserToken, controller.userController.showUserProfile);
router.put("/verify-user", controller.userController.verifyUser);
router.put("/edit-user", validate(userEditSchema), verifyUserToken, controller.userController.editUserProfile);
router.put("/change-user-password", validate(userChangePasswordSchema), verifyUserToken, controller.userController.changePassword);
router.post("/forget-password", validate(forgetPasswordSchema), controller.userController.forgetPassword);
router.put("/reset-password", validate(userResetPasswordSchema), controller.userController.resetPassword);

//====================== Feedback ================================//
router.post("/submit-user-feedback", validate(userFeedbackValidation), controller.userController.submitFeedBack);

//===================== Testimonial ========================//
router.get("/get-testimonial", controller.userController.getTestimonial);

//===================== News ========================//
router.get("/get-news-list", controller.adminController.getNewsList);
router.get("/get-news", controller.adminController.getNewsById);

// ====================== Search Everything ====================//
router.get('/all-spot', controller.spotifyController.searchPageAPI)
router.get('/artist-biblio', controller.lyricsController.artistDetailsByDB)
router.post("/search", controller.spotifyController.searchSAA); //from spotify
router.get("/artist/song", controller.spotifyController.artistAlbums); //from spotify
router.get("/album/songs", controller.spotifyController.getAlbumSong); //from spotify
router.get("/songs-of-artist", controller.spotifyController.songByArtist); //from spotify
router.get("/artistDetails", controller.spotifyController.getArtistDetails); //from spotify
router.post("/getArtistsByLetter", controller.spotifyController.getArtistsByLetter); //from spotify
router.get("/getArtistSongs", controller.spotifyController.getArtistSongs); //from spotify
router.get("/albumDetails", controller.spotifyController.albumDetails); //from spotify
router.post("/search-lyricfind", controller.lyricsController.searchLyricsFindSongs); //from lyricsfind

//Hot Album List
router.get("/user-hot-album", controller.userController.getHotSongList);

//artist list amd albums
router.get("/artist-list", controller.artistController.getAllArtistName);
router.get("/artist-albums", controller.artistController.getArtistAlbums);
router.get("/artist-songs", controller.artistController.getArtiSongs);
router.get("/albums-songs", controller.artistController.getSongsOfAlbums);

//comments
router.post("/add-comment", validate(userCommentValidation), verifyUserToken, controller.userController.addUserComment);
router.get("/get-user-comments-list", controller.userController.getUserComments);
router.put("/update-user-comment-status", verifyUserToken, controller.userController.updateUserCommentStatus);
router.put("/edit-user-comment", verifyUserToken, controller.userController.editUserComment);
router.delete("/delete-user-comment", verifyUserToken, controller.userController.deleteUserComment);

module.exports = router;
