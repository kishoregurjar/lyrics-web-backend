const express = require("express");
const controller = require("../controllers/indexController");
const router = express.Router();

router.use("/user", require("./userRoute"));
router.use("/admin", require("./adminRoute"));

router.post("/get-search-lyrics", controller.adminController.getSearchLyrics);
router.post("/get-lyrics", controller.adminController.getLyrics);

module.exports = router;
