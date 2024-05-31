const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const { catchRes, successRes } = require("../utils/response");
const mongoose = require("mongoose");
const { assignJwt } = require("../middlewares/authMiddleware");
const jwt = require("jsonwebtoken");
const { genericMail } = require("../utils/sendMail");
const { default: axios } = require("axios");
const Feedback = require("../models/reviewsModel");

/* Auth Section */
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

/* Admin Access Section */
module.exports.getUserFeedbacksList = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const feedbacks = await Feedback.find().session(session);

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Return the feedbacks in the response
    return successRes(
      res,
      200,
      true,
      "User Feedback List Retrieved Successfully",
      feedbacks
    );
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();
    console.error("Error Retrieving User Feedbacks:", error);
    return catchRes(res, error);
  }
};

/* Lyrics Section */
module.exports.getLyrics = async (req, res) => {
  try {
    const { artist, track } = req.query;

    if (!artist || !track) {
      return successRes(res, 400, false, "Artist and Track are required.");
    }

    // LyricFind API details
    const apiType = "https://api.lyricfind.com/lyric.do";
    const apiKey = process.env.LF_API_KEY;
    const lrcKey = process.env.LF_LRC_KEY;
    const territory = `territory=${process.env.LF_TERRITORY}`;
    const reqType = "reqtype=default";
    const format = "format=lrc";
    const output = "output=json";

    const url1 = `${apiType}?apikey=${apiKey}&${territory}&${reqType}&lrckey=${lrcKey}&trackid=amg:2033&${format}&${output}`;
    const url2 = `${apiType}?apikey=${apiKey}&${territory}&${reqType}&trackid=isrc:USGF19925401&${output}`;
    const url3 = `${apiType}?apikey=${apiKey}&${territory}&${reqType}&trackid=artistname:eminem,trackname:white+america&${output}`;

    console.log(url1);

    // Make the request to LyricFind API
    const response = await axios.get(url2);

    console.log(response.data);

    if (response.data && response.data) {
      return successRes(
        res,
        200,
        true,
        "Lyrics Retrieved Successfully",
        response.data
      );
    } else {
      return successRes(res, 404, false, "Lyrics Not Found.");
    }
  } catch (error) {
    console.error("Error Get Lyrics:", error);
    return catchRes(res, error);
  }
};

module.exports.getTopLyrics = async (req, res) => {
  try {
    // LyricFind API details
    const apiType = "https://api.lyricfind.com/charts.do";
    const apiKey = process.env.LF_API_KEY;
    const lrcKey = process.env.LF_LRC_KEY;
    const territory = `territory=${process.env.LF_TERRITORY}`;
    const reqType = "reqtype=trackcharts";

    const url1 = `${apiType}?apikey=${lrcKey}&${territory}&${reqType}&displaykey=${apiKey}`;

    console.log(url1);

    // Make the request to LyricFind API
    const response = await axios.get(url1);

    console.log(response.data);

    if (response.data && response.data.track && response.data.track.lyrics) {
      const lyrics = response.data.track.lyrics;
      return successRes(res, 200, true, "Lyrics Retrieved Successfully", {
        artist,
        track,
        lyrics,
      });
    } else {
      return successRes(res, 404, false, "Lyrics Not Found.");
    }
  } catch (error) {
    console.error("Error Get Lyrics:", error);
    return catchRes(res, error);
  }
};

module.exports.getSearchLyrics = async (req, res) => {
  try {
    // LyricFind API details
    const apiType = "https://api.lyricfind.com/search.do";
    const apiKey = process.env.LF_API_KEY;
    const lrcKey = process.env.LF_LRC_KEY;
    const searchKey = process.env.LF_SEARCH_KEY;
    const territory = `territory=${process.env.LF_TERRITORY}`;
    const reqType = "reqtype=default";
    const format = "format=lrc";
    const output = "output=json";

    const url1 = `${apiType}?apikey=${searchKey}&${territory}&${reqType}&displaykey=${lrcKey}&${output}&searchtype=track&lyrics=I+kissed+a+girl+and+i+liked+it&alltracks=no`;

    console.log(url1);

    // Make the request to LyricFind API
    const response = await axios.get(url1);

    console.log(response.data);

    if (response.data && response.data) {
      return successRes(
        res,
        200,
        true,
        "Lyrics Retrieved Successfully",
        response.data
      );
    } else {
      return successRes(res, 404, false, "Lyrics Not Found.");
    }
  } catch (error) {
    console.error("Error Get Lyrics:", error);
    return catchRes(res, error);
  }
};
