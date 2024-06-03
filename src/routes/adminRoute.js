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
} = require("../middlewares/adminValidation");
const { verifyAdminToken } = require("../middlewares/authMiddleware");

const router = express.Router();

// Helper function to apply validation middlewares
const validation = (validations) => [...validations, handleValidationErrors];

// Admin Authentication Routes
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

// Sub-router for routes requiring admin token verification
const protectedRoute = express.Router();

protectedRoute.use(verifyAdminToken);

protectedRoute.put(
  "/change-password",
  validation([validateChangePassword]),
  controller.adminController.changePassword
);

protectedRoute.put(
  "/edit-admin-profile",
  validation([validateEditAdminProfile]),
  controller.adminController.editAdminProfile
);

protectedRoute.get(
  "/admin-profile",
  controller.adminController.showAdminProfile
);

protectedRoute.get(
  "/get-user-feedbacks-list",
  controller.adminController.getUserFeedbacksList
);

// Testimonial Routes
protectedRoute.post(
  "/add-testimonial",
  validation([validateAddTestimonial]),
  controller.adminController.addTestimonial
);

protectedRoute.put(
  "/update-testimonial",
  validation([validateUpdateTestimonial]),
  controller.adminController.updateTestimonial
);

protectedRoute.put(
  "/delete-testimonial",
  controller.adminController.deleteTestimonial
);

protectedRoute.get(
  "/get-testimonials-list",
  controller.adminController.getTestimonialsList
);

// Use the protectedRoute for all routes that require admin verification
router.use(protectedRoute);

// Lyrics Routes
router.get("/get-lyrics", controller.adminController.getLyrics);

router.get("/get-top-lyrics", controller.adminController.getTopLyrics);

router.get("/get-search-lyrics", controller.adminController.getSearchLyrics);

module.exports = router;
