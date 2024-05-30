const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const { catchRes, successRes } = require("../utils/response");
const mongoose = require("mongoose");
const { assignJwt } = require("../middlewares/authMiddleware");
const jwt = require("jsonwebtoken");

module.exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return successRes(res, 400, false, "All Fields are Required.");
    }

    const existingAdmin = await Admin.findOne({ email });
    if (!existingAdmin) {
      return successRes(res, 404, false, "Admin Not Found");
    }

    const isMatch = await bcrypt.compare(password, existingAdmin.password);
    if (!isMatch) {
      return successRes(res, 400, false, "Invalid Credentials");
    }

    const token = assignJwt({
      _id: existingAdmin._id,
      email: existingAdmin.email,
      role: existingAdmin.role,
    });

    return successRes(res, 200, true, "Admin Logged in Successfully", token);
  } catch (error) {
    console.error("Error Logging in Admin:", error);
    catchRes(res, error);
  }
};

module.exports.showAdminProfile = async (req, res) => {
  try {
    const adminId = req.user._id;

    const existingAdmin = await Admin.findById(adminId).select(
      "fullName email role"
    );
    if (!existingAdmin) {
      return successRes(res, 404, false, "Admin Not Found");
    }

    return successRes(res, 200, true, "Admin Profile Details", existingAdmin);
  } catch (error) {
    console.error("Error Showing Admin Profile:", error);
    catchRes(res, error);
  }
};

module.exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (!existingAdmin) {
      return successRes(
        res,
        404,
        false,
        "Admin with this Email does not exist"
      );
    }

    let resetToken = jwt.sign(
      {
        _id: existingAdmin._id,
        email: existingAdmin.email,
        role: existingAdmin.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2m",
      }
    );

    console.log(resetToken);

    return successRes(
      res,
      200,
      true,
      "An email has been sent to " + email + " with further instructions."
    );
  } catch (error) {
    console.error("Error Forgetting Password:", error);
    catchRes(res, error);
  }
};

module.exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or Expired Token" });
    }

    // Find the admin by ID
    const existingAdmin = await Admin.findById(decoded._id);
    if (!existingAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password in the database
    existingAdmin.password = hashedPassword;
    await existingAdmin.save();

    return res
      .status(200)
      .json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
