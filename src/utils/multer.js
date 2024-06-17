const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { successRes } = require("./response");

// Utility to create multer configuration
const createMulter = (options = {}) => {
  const {
    folder = "uploads/miscellaneous", // default folder
    fileSize = 10000000, // default file size
    fileTypes = /jpeg|jpg|png|pdf|doc|docx|txt|xls|xlsx|csv|json|zip|rar/, // default file types
  } = options;

  // Ensure the upload directory exists
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  // Set storage engine
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Ensure the folder exists before storing the file
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      // cb(null, `${Date.now()}-${file.originalname}`);
      const ext = file.mimetype.split("/")[1];
      const fileName = `${Date.now()}.${ext}`;
      cb(null, fileName);
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
      const allowedExtensions = fileTypes
        .toString()
        .toUpperCase()
        .replace(/^\//, "") // Remove slash at the start
        .replace(/\/$/, "") // Remove slash at the end
        .replace(/\|/g, ", ");
      const errorMessage = `Only ${allowedExtensions} files are allowed.`;
      cb(errorMessage);
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
        return successRes(res, 400, false, err);
      }
      next();
    });
  };
};

// Middleware for multiple file uploads
const uploadMultipleFiles = (fieldName, maxCount, options) => {
  const upload = createMulter(options).array(fieldName, maxCount);
  return (req, res, next) => {
    console.log(req.file);
    console.log(req.files);

    // Check file count
    if (req.files && req.files.length > maxCount) {
      return successRes(
        res,
        400,
        false,
        `No more than ${maxCount} files are allowed.`
      );
    }
    if (req.files && req.files.length < minCount) {
      return successRes(
        res,
        400,
        false,
        `At least ${minCount} files are required.`
      );
    }

    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return successRes(res, 400, false, err.message);
        } else {
          return successRes(res, 400, false, err.message);
        }
      }
      next();
    });
  };
};

/* Admin Section */
module.exports.uploadAdminAvatar = uploadSingleFile("image", {
  fileTypes: /jpeg|jpg|png/,
  folder: "uploads/admin_profile_pictures",
});

module.exports.uploadTestimonialAvatar = uploadSingleFile("image", {
  fileTypes: /jpeg|jpg|png/,
  folder: "uploads/testimonial_pictures",
});

module.exports.uploadNewsAvatar = uploadSingleFile("image", {
  fileTypes: /jpeg|jpg|png/,
  folder: "uploads/news_pictures",
});

module.exports.uploadCarouselImages = uploadMultipleFiles("images", 5, {
  fileTypes: /jpeg|jpg|png/,
  folder: "uploads/carousel_pictures",
});

/* User Section */
module.exports.uploadUserAvatar = uploadSingleFile("image", {
  fileTypes: /jpeg|jpg|png/,
  folder: "uploads/user_profile_pictures",
});

module.exports.uploadSingleFile = uploadSingleFile;
module.exports.uploadMultipleFiles = uploadMultipleFiles;
