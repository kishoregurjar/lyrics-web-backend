const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
const { catchRes, successRes } = require("../utils/response");
const mongoose = require("mongoose");
const { assignJwt } = require("../middlewares/authMiddleware");
const jwt = require("jsonwebtoken");
const { genericMail } = require("../utils/sendMail");
const { default: axios } = require("axios");
const Feedback = require("../models/reviewsModel");
const Testimonial = require("../models/testimonialModel");

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
      .select("fullName email role mobile")
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

    const resetPassLink = `${process.env.FORGET_PASSWORD}/${resetToken}`;

    genericMail(
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

module.exports.uploadProfilePicture = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  const adminId = req.admin.id; // Assumes admin id is stored in the token and set in req.admin
  const filePath = `/uploads/profile_pictures/${req.file.filename}`;

  try {
    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { profilePicture: filePath },
      { new: true }
    );

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully",
      data: admin,
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* Admin Access Section */
module.exports.getUserFeedbacksList = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const feedbacks = await Feedback.find().session(session);

    await session.commitTransaction();
    session.endSession();

    return successRes(
      res,
      200,
      true,
      "User Feedback List Retrieved Successfully",
      feedbacks
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error Retrieving User Feedbacks:", error);
    return catchRes(res, error);
  }
};

/* Testimonial Section */
module.exports.addTestimonial = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { fullName, rating, description, avatar } = req.body;

    const newTestimonial = new Testimonial({
      fullName,
      rating,
      description,
      avatar,
    });

    const savedTestimonial = await newTestimonial.save({ session });

    await session.commitTransaction();
    session.endSession();

    return successRes(
      res,
      201,
      true,
      "Testimonial Created Successfully",
      savedTestimonial
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error Creating Testimonial:", error);
    return catchRes(res, error);
  }
};

module.exports.updateTestimonial = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { tid } = req.query;
    const { fullName, rating, description, avatar } = req.body;

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      tid,
      { fullName, rating, description, avatar, updatedAt: Date.now() },
      { new: true, session }
    );

    if (!updatedTestimonial) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 404, false, "Testimonial Not Found");
    }

    await session.commitTransaction();
    session.endSession();

    return successRes(
      res,
      200,
      true,
      "Testimonial Updated Successfully",
      updatedTestimonial
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error Updating Testimonial:", error);
    return catchRes(res, error);
  }
};

module.exports.deleteTestimonial = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { tid } = req.query;

    const deletedTestimonial = await Testimonial.findByIdAndUpdate(
      tid,
      { deletedAt: Date.now() },
      { new: true, session }
    );

    if (!deletedTestimonial) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 404, false, "Testimonial Not Found");
    }

    await session.commitTransaction();
    session.endSession();

    return successRes(
      res,
      200,
      true,
      "Testimonial Soft Deleted Successfully",
      deletedTestimonial
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error Soft Deleting Testimonial:", error);
    return catchRes(res, error);
  }
};

module.exports.getTestimonialsList = async (req, res) => {
  try {
    // Extract query parameters for pagination, sorting, and filtering
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    const skip = (page - 1) * limit;

    // Filter to include testimonials where deletedAt is null or does not exist
    const filter = {
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    // Find testimonials with pagination and sorting
    const testimonials = await Testimonial.find(filter)
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    // Count the total number of testimonials for pagination
    const totalTestimonials = await Testimonial.countDocuments(filter);

    return successRes(res, 200, true, "Testimonials List", {
      testimonials,
      totalTestimonials,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalTestimonials / limit),
    });
  } catch (error) {
    console.error("Error Getting Testimonials List:", error);
    return catchRes(res, error);
  }
};

/* Lyrics Section */
module.exports.getLyrics = async (req, res) => {
  try {
    const { trackId } = req.body;

    // LyricFind API details
    const apiType = "https://api.lyricfind.com/lyric.do";
    const apiKey = process.env.LF_API_KEY;
    const territory = `territory=${process.env.LF_TERRITORY}`;
    const reqType = "reqtype=default";
    const output = "output=json";
    const displayKey = process.env.LF_LRC_KEY;

    const url1 = `${apiType}?apikey=${apiKey}&${territory}&${reqType}&displaykey=${displayKey}&trackid=isrc:${trackId}&${output}`;

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
    let { query } = req.body;

    if (!query) {
      return successRes(res, 400, false, "Track Name is required.");
    }

    // LyricFind API details
    const apiType = "https://api.lyricfind.com/search.do";
    const apiKey = process.env.LF_API_KEY;
    const searchKey = process.env.LF_SEARCH_KEY;
    const territory = `territory=${process.env.LF_TERRITORY}`;
    const reqType = "reqtype=default";
    const output = "output=json";

    // URL-encode the track name and replace spaces with '+'
    const encodedTrackName = encodeURIComponent(query).replace(/%20/g, "+");
    console.log(encodedTrackName);
    const lyrics = `lyrics=${encodedTrackName}`;

    // Construct the URL
    const url = `${apiType}?apikey=${searchKey}&${territory}&${reqType}&displaykey=${apiKey}&${output}&searchtype=track&alltracks=no&${lyrics}`;

    console.log(url);

    // Make the request to LyricFind API
    const { status, data } = await axios.get(url);

    console.log(data);

    if (status === 200 && data && data.tracks) {
      return successRes(
        res,
        200,
        true,
        "Lyrics Retrieved Successfully",
        data.tracks
      );
    } else {
      return successRes(res, 404, false, "Lyrics Not Found.");
    }
  } catch (error) {
    console.error("Error Get Lyrics:", error);
    return catchRes(res, error);
  }
};
