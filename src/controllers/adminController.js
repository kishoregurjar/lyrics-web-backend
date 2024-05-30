const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const { catchRes, successRes } = require("../utils/response");
const mongoose = require("mongoose");
const { assignJwt } = require("../middlewares/authMiddleware");

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
