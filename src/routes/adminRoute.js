const express = require("express");
const controller = require("../controllers/indexController");
const {
  validateAdminLogin,
  handleValidationErrors,
} = require("../middlewares/adminValidation");

const router = express.Router();

router.post(
  "/login-admin",
  validateAdminLogin,
  handleValidationErrors,
  controller.adminController.adminLogin
);

module.exports = router;
