const express = require("express");
const controller = require("../controllers/indexController");
const {
  validateAdminLogin,
  handleValidationErrors,
} = require("../middlewares/adminValidation");
const { verifyAdminToken } = require("../middlewares/authMiddleware");

const router = express.Router();

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

router.post("/forget-password", controller.adminController.forgetPassword);

router.put("/reset-password", controller.adminController.resetPassword);

module.exports = router;
