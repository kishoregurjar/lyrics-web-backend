const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const { catchRes, successRes } = require("../utils/response");
const mongoose = require("mongoose");
const { assignJwt } = require("../middlewares/authMiddleware");
const jwt = require("jsonwebtoken");
const { genericMail } = require("../utils/sendMail");

module.exports.adminLogin = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 400, false, "All Fields are Required.");
    }

    const existingAdmin = await Admin.findOne({ email }).session(session);
    if (!existingAdmin) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 404, false, "Admin Not Found");
    }

    const isMatch = await bcrypt.compare(password, existingAdmin.password);
    if (!isMatch) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 400, false, "Invalid Credentials");
    }

    const token = assignJwt({
      _id: existingAdmin._id,
      email: existingAdmin.email,
      role: existingAdmin.role,
    });

    await session.commitTransaction();
    session.endSession();
    return successRes(res, 200, true, "Admin Logged in Successfully", token);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error Logging in Admin:", error);
    return catchRes(res, error);
  }
};

module.exports.showAdminProfile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const adminId = req.user._id;

    const existingAdmin = await Admin.findById(adminId)
      .select("fullName email role")
      .session(session);
    if (!existingAdmin) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 404, false, "Admin Not Found");
    }

    await session.commitTransaction();
    session.endSession();
    return successRes(res, 200, true, "Admin Profile Details", existingAdmin);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error Showing Admin Profile:", error);
    return catchRes(res, error);
  }
};

module.exports.forgetPassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { email } = req.body;

    if (!email) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 400, false, "All Fields are Required.");
    }

    const existingAdmin = await Admin.findOne({ email }).session(session);
    if (!existingAdmin) {
      await session.abortTransaction();
      session.endSession();
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
        expiresIn: "5m",
      }
    );

    const resetPassLink = `${process.env.VERIFY_LINK}/${resetToken}`;

    await genericMail(
      existingAdmin.email,
      existingAdmin.fullName,
      resetPassLink,
      "forget"
    );

    await session.commitTransaction();
    session.endSession();
    return successRes(
      res,
      200,
      true,
      "An email has been sent to " + email + " with further instructions."
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error Forgetting Password:", error);
    return catchRes(res, error);
  }
};

module.exports.resetPassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 400, false, "All Fields are Required.");
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 400, false, "Invalid or Expired Reset Token.");
    }

    const existingAdmin = await Admin.findById(decoded._id).session(session);
    if (!existingAdmin) {
      await session.abortTransaction();
      session.endSession();
      return successRes(
        res,
        404,
        false,
        "Admin with this Email does not exist"
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    existingAdmin.password = hashedPassword;
    await existingAdmin.save({ session });

    await session.commitTransaction();
    session.endSession();
    return successRes(res, 200, true, "Password has been Reset Successfully");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error Resetting Password:", error);
    return catchRes(res, error);
  }
};

module.exports.changePassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const adminId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 400, false, "All Fields are Required.");
    }

    const existingAdmin = await Admin.findById(adminId).session(session);
    if (!existingAdmin) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 404, false, "Admin Not Found");
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      existingAdmin.password
    );
    if (!isMatch) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 400, false, "Current Password is Incorrect");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    existingAdmin.password = hashedPassword;
    await existingAdmin.save({ session });

    await session.commitTransaction();
    session.endSession();
    return successRes(res, 200, true, "Password has been Changed Successfully");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error Changing Password:", error);
    return catchRes(res, error);
  }
};

module.exports.editAdminProfile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const adminId = req.user._id;
    const { fullName, email, mobile } = req.body;

    if (!fullName || !email || !mobile) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 400, false, "All Fields are Required.");
    }

    const existingAdmin = await Admin.findById(adminId).session(session);
    if (!existingAdmin) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 404, false, "Admin Not Found");
    }

    if (fullName) existingAdmin.fullName = fullName;
    if (email) existingAdmin.email = email;
    if (mobile) existingAdmin.mobile = mobile;

    await existingAdmin.save({ session });

    await session.commitTransaction();
    session.endSession();
    return successRes(res, 200, true, "Profile Updated Successfully");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating profile:", error);
    return catchRes(res, error);
  }
};
