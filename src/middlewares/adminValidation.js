const { check, validationResult } = require("express-validator");
const { successRes } = require("../utils/response");

const passwordRegex =
  /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[0-9a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;

/* Auth Validation */
exports.validateAdminLogin = [
  check("email")
    .trim()
    .notEmpty()
    .withMessage("Email must be Required")
    .isEmail()
    .withMessage("Invalid Email Address")
    .normalizeEmail(),
  check("password")
    .trim()
    .notEmpty()
    .withMessage("Password must be Required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 Characters long")
    .matches(passwordRegex)
    .withMessage(
      "Password must contain at least a lowercase letter, uppercase letter & number"
    ),
];

exports.validateForgetPassword = [
  check("email")
    .trim()
    .notEmpty()
    .withMessage("Email must be Required")
    .isEmail()
    .withMessage("Invalid Email Address")
    .normalizeEmail(),
];

exports.validateResetPassword = [
  check("resetToken")
    .trim()
    .notEmpty()
    .withMessage("Reset Token is Required")
    .isJWT()
    .withMessage("Invalid Reset Token"),
  check("newPassword")
    .trim()
    .notEmpty()
    .withMessage("New Password is Required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(passwordRegex)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character"
    ),
];

exports.validateChangePassword = [
  check("currentPassword")
    .trim()
    .notEmpty()
    .withMessage("Current password is required"),
  check("newPassword")
    .trim()
    .notEmpty()
    .withMessage("New Password is Required")
    .isLength({ min: 8 })
    .withMessage("Password Must be at least 8 Characters long")
    .matches(passwordRegex)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character"
    ),
];

exports.validateEditAdminProfile = [
  check("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full Name must be Required")
    .isLength({ min: 2, max: 30 })
    .withMessage("Full name must be between 2 and 30 characters long"),
  check("email")
    .trim()
    .notEmpty()
    .withMessage("Email must be Required")
    .isEmail()
    .withMessage("Invalid Email Address")
    .normalizeEmail(),
  check("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile No. must be Required")
    .isLength({ min: 10, max: 10 })
    .withMessage("Mobile number must be a 10-digit number")
    .matches(/^[0-9]{10}$/)
    .withMessage("Mobile number must be a valid 10-digit number"),
];

/* Testimonial Validation */
exports.validateAddTestimonial = [
  check("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full Name must be Required")
    .isString()
    .withMessage("Full Name Should be String Only")
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be between 2 and 30 characters long"),
  check("rating")
    .trim()
    .notEmpty()
    .withMessage("Rating must be Required")
    .isNumeric()
    .withMessage("Rating Should be Numeric Only"),
  check("description")
    .trim()
    .notEmpty()
    .withMessage("Description must be Required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters long"),
];

exports.validateUpdateTestimonial = [
  check("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full Name must be Required")
    .isString()
    .withMessage("Full Name Should be String Only")
    .isLength({ min: 2, max: 50 })
    .withMessage("Full name must be between 2 and 30 characters long"),
  check("rating")
    .trim()
    .notEmpty()
    .withMessage("Rating must be Required")
    .isNumeric()
    .withMessage("Rating Should be Numeric Only"),
  check("description")
    .trim()
    .notEmpty()
    .withMessage("Description must be Required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Description must be between 10 and 1000 characters long"),
];

/* News Validation */
exports.validateAddNews = [
  check("title")
    .trim()
    .notEmpty()
    .withMessage("Title is Required")
    .isString()
    .withMessage("Title Should be String Only"),
  check("description")
    .trim()
    .notEmpty()
    .withMessage("Description is Required")
    .isString()
    .withMessage("Description Should be String Only"),
  check("author")
    .trim()
    .notEmpty()
    .withMessage("Author is Required")
    .isString()
    .withMessage("Author Should be String Only"),
  check("publishDate")
    .trim()
    .notEmpty()
    .withMessage("Publish Date is Required")
    .isDate({ format: "DD-MM-YYYY" })
    .withMessage("Publish Date must be a valid date in DD-MM-YYYY format"),
];

exports.validateUpdateNews = [
  check("title")
    .trim()
    .notEmpty()
    .withMessage("Title is Required")
    .isString()
    .withMessage("Title Should be String Only"),
  check("description")
    .trim()
    .notEmpty()
    .withMessage("Description is Required")
    .isString()
    .withMessage("Description Should be String Only"),
  check("author")
    .trim()
    .notEmpty()
    .withMessage("Author is Required")
    .isString()
    .withMessage("Author Should be String Only"),
  check("publishDate")
    .trim()
    .notEmpty()
    .withMessage("Publish Date is Required")
    .isDate({ format: "DD-MM-YYYY" })
    .withMessage("Publish Date must be a valid date in DD-MM-YYYY format"),
];

// Middleware Function to Handle Validation Errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return successRes(res, 400, false, errors.array()[0].msg);
  }
  next();
};
