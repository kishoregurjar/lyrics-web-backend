const express = require("express");
const controller = require("../controllers/indexController");
const router = express.Router();

router.post("/login-admin", controller.adminController.adminLogin);

module.exports = router;
