const express = require("express");
const controller = require("../controllers/indexController");
const {
  validateAdminLogin,
  handleValidationErrors,
  validateForgetPassword,
  validateResetPassword,
  validateChangePassword,
  validateEditAdminProfile,
  validateAddTestimonial,
  validateUpdateTestimonial,
  validateAddNews,
  validateUpdateNews,
} = require("../middlewares/adminValidation");
const { verifyAdminToken } = require("../middlewares/authMiddleware");
const {
  uploadAdminAvatar,
  uploadTestimonialAvatar,
  uploadNewsAvatar,
  uploadCarouselImages,
  uploadArtistCsvFile,
} = require("../utils/multer");
const { uploadProfile, uploadCarousel } = require("../utils/multerConfig");

const router = express.Router();

// Helper function to apply validation middlewares
const validation = (validations) => [...validations, handleValidationErrors];

/* Auth Routes */
router.post(
  "/login-admin",
  validation([validateAdminLogin]),
  controller.adminController.adminLogin
);

router.post(
  "/forget-password",
  validation([validateForgetPassword]),
  controller.adminController.forgetPassword
);

router.put(
  "/reset-password",
  validation([validateResetPassword]),
  controller.adminController.resetPassword
);

router.post(
  "/upload-profile-picture",
  verifyAdminToken,
  uploadAdminAvatar,
  controller.adminController.uploadAdminAvatar
);

router.put(
  "/change-password",
  validation([validateChangePassword]),
  verifyAdminToken,
  controller.adminController.changePassword
);

router.put(
  "/edit-admin-profile",
  validation([validateEditAdminProfile]),
  verifyAdminToken,
  controller.adminController.editAdminProfile
);

router.get(
  "/admin-profile",
  verifyAdminToken,
  controller.adminController.showAdminProfile
);

/* Admin Access */
router.get(
  "/get-user-feedbacks-list",
  verifyAdminToken,
  controller.adminController.getUserFeedbacksList
);

router.post(
  "/upload-carousel-images",
  verifyAdminToken,
  uploadCarouselImages,
  controller.adminController.uploadCarouselImages
);

/* Testimonial Routes */
router.post(
  "/add-testimonial",
  validation([validateAddTestimonial]),
  verifyAdminToken,
  controller.adminController.addTestimonial
);

router.put(
  "/update-testimonial",
  validation([validateUpdateTestimonial]),
  verifyAdminToken,
  controller.adminController.updateTestimonial
);

router.put(
  "/delete-testimonial",
  verifyAdminToken,
  controller.adminController.deleteTestimonial
);

router.get(
  "/get-testimonials-list",
  verifyAdminToken,
  controller.adminController.getTestimonialsList
);

router.post(
  "/upload-testimonial-avatar",
  verifyAdminToken,
  uploadTestimonialAvatar,
  controller.adminController.uploadTestimonialAvatar
);

/* News Routes */
router.post(
  "/add-news",
  validation([validateAddNews]),
  verifyAdminToken,
  controller.adminController.addNews
);

router.get("/get-news-list", controller.adminController.getNewsList);

router.get("/get-news", controller.adminController.getNewsById);

router.put(
  "/update-news",
  validation([validateUpdateNews]),
  verifyAdminToken,
  controller.adminController.updateNews
);

router.put(
  "/delete-news",
  verifyAdminToken,
  controller.adminController.deleteNews
);

router.post(
  "/upload-news-avatar",
  verifyAdminToken,
  uploadNewsAvatar,
  controller.adminController.uploadNewsAvatar
);

/* Hot Albums Routes */
router.post(
  "/add-hot-album",
  verifyAdminToken,
  controller.lyricsController.addHotSong
);

router.post(
  "/add-actual-hot-album",
  verifyAdminToken,
  controller.lyricsController.addHotAlbums
);
router.get(
  "/get-actual-hot-album",
  controller.lyricsController.getActualHotAlbum
);

router.delete('/delete-actual-hot-album', verifyAdminToken, controller.lyricsController.deleteActualHotAlbum)

router.get(
  "/get-hot-album",
  verifyAdminToken,
  controller.lyricsController.getHotSongList
);

router.get("/search-song", controller.spotifyController.searchSong);

router.delete(
  "/delete-song",
  verifyAdminToken,
  controller.lyricsController.deleteHotSong
);

/* Lyrics Routes */
router.post("/get-admin-lyrics", controller.lyricsController.getLyricsAdmin);

/* Top Chart Routes*/
router.get("/top-chart-list", controller.topChartController.getTopChartList);

router.get("/top-chart-details", controller.topChartController.topChartDetails);

router.delete(
  "/delete-top-chart",
  verifyAdminToken,
  controller.topChartController.deleteTopChart
);

/* Comment Routes */
router.get(
  "/get-user-comments-list",
  controller.userController.getUserComments
);

router.put(
  "/update-user-comment-status",
  verifyAdminToken,
  controller.userController.updateUserCommentStatus
);

router.delete(
  "/delete-user-comment",
  verifyAdminToken,
  controller.adminController.deleteUserCommentByAdmin
);

/* Spotify Powered APIs */
// router.post("/search-songs", controller.spotifyController.searchSongSpotify);

router.get("/album/songs", controller.spotifyController.getAlbumSong); //from spotify
router.get(
  "/artist/song",
  controller.spotifyController.artistAlbumsWithNameSearching
); //from spotify
router.post(
  "/upload-artist-csv-file",
  uploadArtistCsvFile,
  controller.spotifyController.uploadArtistDetails
);

module.exports = router;
