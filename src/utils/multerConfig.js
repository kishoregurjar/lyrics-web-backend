/* This is Another Way of Uploading files through Multer */

const multer = require("multer");

/* Upload Profile */
const storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/profile");
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    const fileName = `${Date.now()}.${ext}`;
    cb(null, fileName);
  },
});

const uploadProfile = multer({
  storage: storage1,
});

/* Upload Multiple */
const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/carousel_pictures");
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    const fileName = `${Date.now()}.${ext}`;
    cb(null, fileName);
  },
});

const uploadCarousel = multer({
  storage: storage2,
});

module.exports = { uploadProfile, uploadCarousel };
