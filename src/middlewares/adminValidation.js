const { check, validationResult } = require("express-validator");

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

// Middleware Function to Handle Validation Errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }
  next();
};
