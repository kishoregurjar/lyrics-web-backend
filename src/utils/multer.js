const multer = require("multer");
const path = require("path");

// Utility to create multer configuration
const createMulter = (options = {}) => {
  const {
    folder = "uploads",
    fileSize = 10000000,
    fileTypes = /jpeg|jpg|png|pdf/,
  } = options;

  // Set storage engine
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  });

  // Check file type
  const checkFileType = (file, cb) => {
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(`Error: Only ${fileTypes.toString()} are allowed!`);
    }
  };

  return multer({
    storage: storage,
    // limits: { fileSize: fileSize },
    fileFilter: (req, file, cb) => {
      checkFileType(file, cb);
    },
  });
};

// Middleware for single file upload
const uploadSingleFile = (fieldName, options) => {
  const upload = createMulter(options).single(fieldName);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err });
      }
      next();
    });
  };
};

// Middleware for multiple file uploads
const uploadMultipleFiles = (fieldName, maxCount, options) => {
  const upload = createMulter(options).array(fieldName, maxCount);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err });
      }
      next();
    });
  };
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
};
