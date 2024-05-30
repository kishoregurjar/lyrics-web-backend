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
      id: existingAdmin._id,
      email: existingAdmin.email,
      role: existingAdmin.role,
    });

    return successRes(res, 200, true, "Admin Logged in Successfully", token);
  } catch (error) {
    console.error("Error logging in admin:", error);
    catchRes(res, error);
  }
};
