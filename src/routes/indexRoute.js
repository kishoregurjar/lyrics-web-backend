const express = require("express");
const controller = require("../controllers/indexController");
const router = express.Router();

router.use("/user", require("./userRoute"));
router.use("/admin", require("./adminRoute"));

module.exports = router;
