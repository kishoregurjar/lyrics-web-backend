const express = require("express");
const controller = require("../controllers/indexController");
const {
  validateAdminLogin,
  handleValidationErrors,
  validateForgetPassword,
  validateResetPassword,
  validateChangePassword,
  validateEditAdminProfile,
} = require("../middlewares/adminValidation");
const { verifyAdminToken } = require("../middlewares/authMiddleware");

const router = express.Router();

/* Auth Routes */
router.post(
  "/login-admin",
  validateAdminLogin,
  handleValidationErrors,
  controller.adminController.adminLogin
);

router.get(
  "/admin-profile",
  verifyAdminToken,
  controller.adminController.showAdminProfile
);

router.post(
  "/forget-password",
  validateForgetPassword,
  handleValidationErrors,
  controller.adminController.forgetPassword
);

router.put(
  "/reset-password",
  validateResetPassword,
  handleValidationErrors,
  controller.adminController.resetPassword
);

router.put(
  "/change-password",
  verifyAdminToken,
  validateChangePassword,
  handleValidationErrors,
  controller.adminController.changePassword
);

router.put(
  "/edit-admin-profile",
  verifyAdminToken,
  validateEditAdminProfile,
  handleValidationErrors,
  controller.adminController.editAdminProfile
);

/* Admin Access */
router.get(
  "/get-user-feedbacks-list",
  verifyAdminToken,
  controller.adminController.getUserFeedbacksList
);

/* Lyrics Routes */
router.get("/get-lyrics", controller.adminController.getLyrics);

router.get("/get-top-lyrics", controller.adminController.getTopLyrics);

router.get("/get-search-lyrics", controller.adminController.getSearchLyrics);

module.exports = router;
