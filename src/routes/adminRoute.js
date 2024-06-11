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
const { uploadAdminAvatar } = require("../utils/multer");

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
  controller.adminController.uploadProfilePicture
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

router.get(
  "/get-user-feedbacks-list",
  verifyAdminToken,
  controller.adminController.getUserFeedbacksList
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

/* Hot Albums Routes */
router.post("/add-hot-album", controller.lyricsController.addHotSong);

router.get("/get-hot-album", controller.lyricsController.getHotSongList);

router.get("/search-song", controller.lyricsController.searchSong);

router.delete("/delete-song", controller.lyricsController.deleteHotSong);

/* Lyrics Routes */
router.post("/get-admin-lyrics", controller.lyricsController.getLyricsAdmin);

router.get("/get-lyrics", controller.adminController.getLyrics);

router.get("/get-top-lyrics", controller.adminController.getTopLyrics);

router.get("/get-search-lyrics", controller.adminController.getSearchLyrics);

module.exports = router;
