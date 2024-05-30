const { check, validationResult } = require("express-validator");

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
    .withMessage("Password must be at least 8 characters long")
    .matches(
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[0-9a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/
    )
    .withMessage(
      "Password must contain at least a lowercase letter, uppercase letter & number"
    ),
];

// Middleware function to handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }
  next();
};
