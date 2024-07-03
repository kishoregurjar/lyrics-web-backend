const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const Feedback = require("../models/reviewsModel");
const Testimonial = require("../models/testimonialModel");
const hotAlbmubModel = require("../models/hotAlbmubModel");
const UserComment = require("../models/userCommentModel");

const { assignJwt } = require("../middlewares/authMiddleware");
const { catchRes, successRes, SwrRes, swrRes } = require("../utils/response");
const { genericMail } = require("../utils/sendMail");
const { USER_AVATAR } = require("../utils/constants");

module.exports.isAuthorized = async (req, res) => {
  try {
    const { passKey } = req.body;
    const originalPassKey = 'LYRICS528'
    if (passKey !== originalPassKey) {
      return successRes(res, 404, false, "Pass Key is invalid")
    }
    const payload = {
      _id: "6684d95ce827f4eb6c31bdc2",
      email: "testuser@yopmail.com",
      role: "user",
    }
    const token = assignJwt(payload);

    const userObj = {
      "_id": "6684d95ce827f4eb6c31bdc2",
      "email": "testuser@yopmail.com",
      "firstName": "Test User",
      "lastName": "Lyrics Web",
      "mobile": "1234567890",
      "isActive": true,
      "isVerified": false,
      "avatar": "http://localhost:3007/user_profile_pictures/1718797769994.jpeg",
      "token": token
    }

    return successRes(res, 200, true, "Login successful", userObj);

  } catch (error) {
    return catchRes(res, error)
  }
}

/* Auth Section */
module.exports.createUser = async (req, res, next) => {
  let { firstName, lastName, email, password, mobile, avatar } = req.body;
  email = email.toLowerCase();
  if (!firstName || !lastName || !email || !password || !mobile) {
    return catchRes(res, "All fields are required.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return successRes(
        res,
        409,
        false,
        "User with this email already exists.",
        null
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      mobile,
      avatar,
    });

    const user = await newUser.save({ session });

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return SwrRes(res);
    }

    await session.commitTransaction();
    session.endSession();
    const token = assignJwt({
      _id: user._id,
      email: user.email,
      role: "user",
    });
    const verifyLink = `${process.env.VERIFY_LINK}/${token}`;
    genericMail(email, user.firstName, verifyLink, "welcome");
    return successRes(res, 201, true, "User created successfully.", null);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return catchRes(res, error);
  }
};

module.exports.loginUser = async (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase();
  if (!email || !password) {
    return successRes(res, 400, false, "All fields are required.");
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return successRes(res, 401, false, "Invalid email or password.");
    }

    if (!user.isVerified) {
      return successRes(res, 401, false, "User is not verified.");
    }
    if (!user.isActive) {
      return successRes(res, 401, false, "User is not active.");
    }

    user.lastApiHitTime = new Date();
    await user.save();

    const token = assignJwt({
      _id: user._id,
      email: user.email,
      role: "user",
    });

    const userObj = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      isVerified: user.isVerified,
      isActive: user.isActive,
      token: token,
    };

    return successRes(res, 200, true, "Login successful", userObj);
  } catch (error) {
    return catchRes(res, error);
  }
};

module.exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return successRes(res, 400, false, "No File Uploaded");
    }

    const filePath = `${USER_AVATAR}${req.file.filename}`;

    return successRes(res, 200, true, "Profile Picture Uploaded Successfully", {
      path: filePath,
    });
  } catch (error) {
    console.error("Error Uploading Profile Picture:", error);
    return catchRes(res, error);
  }
};

module.exports.showUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select(
      "-password -__v -createdAt -updatedAt"
    );

    if (!user) {
      return successRes(res, 401, false, "User not found.");
    }

    return successRes(res, 200, true, "User Details.", user);
  } catch (error) {
    return catchRes(res, error);
  }
};

module.exports.verifyUser = async (req, res) => {
  try {
    let token = req.body.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return successRes(res, 401, false, "Invalid token");
    }
    const user = await User.findByIdAndUpdate(
      decoded._id,
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return successRes(res, 401, false, "User not found.");
    }

    return successRes(res, 200, true, "User verified successfully.");
  } catch (error) {
    return catchRes(res, error);
  }
};

module.exports.editUserProfile = async (req, res) => {
  const userId = req.user._id;
  let { firstName, lastName, mobile } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const update = {};
    if (firstName) update.firstName = firstName;
    if (lastName) update.lastName = lastName;
    if (mobile) update.mobile = mobile;

    const options = { new: true, session };

    const user = await User.findByIdAndUpdate(userId, update, options);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 401, false, "User not found.");
    }

    await session.commitTransaction();
    session.endSession();

    return successRes(
      res,
      200,
      true,
      "User profile updated successfully.",
      user
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return catchRes(res, error);
  }
};

module.exports.changePassword = async (req, res) => {
  const userId = req.user._id;
  const { oldPassword, newPassword } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 401, false, "User not found.");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 400, false, "Old password is incorrect.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;

    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    return successRes(res, 200, true, "Password updated successfully.");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return catchRes(res, error);
  }
};

module.exports.forgetPassword = async (req, res) => {
  let { email } = req.body;

  email = email.toLowerCase();
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return successRes(res, 404, false, "User not found.");
    }
    const token = jwt.sign({ _id: user._id, email }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });
    const link = `${process.env.FORGET_PASSWORD}/${token}`;
    genericMail(email, user?.firstName, link, "forget");
    return successRes(res, 200, true, "Password reset link sent to your email");
  } catch (error) {
    return catchRes(res, error);
  }
};

module.exports.resetPassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let token = req.body.resetToken;
    let newPassword = req.body.newPassword;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return successRes(res, 401, false, "Link is expired");
      } else {
        return successRes(res, 401, false, "Invalid token");
      }
    }
    const user = await User.findById(decoded._id).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return successRes(res, 401, false, "User not found.");
    }
    user.password = await bcrypt.hash(newPassword, 12);
    let updateUser = await user.save({ session });
    if (!updateUser) {
      await session.abortTransaction();
      session.endSession();
      return swrRes(res);
    }
    await session.commitTransaction();
    session.endSession();
    return successRes(res, 200, true, "Password updated successfully.");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return catchRes(res, error);
  }
};

/* User Access */
module.exports.submitFeedBack = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let { name, email, subject, message } = req.body;
    email = email.toLowerCase();

    const feedback = new Feedback({
      name,
      email,
      subject,
      message,
    });

    let saveFeedback = await feedback.save({ session });
    if (!saveFeedback) {
      await session.abortTransaction();
      session.endSession();
      return swrRes(res);
    }

    await session.commitTransaction();
    session.endSession();

    return successRes(res, 201, true, "Feedback Submitted Successfully.");
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return catchRes(res, error);
  }
};

module.exports.getTestimonial = async (req, res) => {
  try {
    let testimonialData = await Testimonial.find();
    if (!testimonialData || testimonialData.length === 0) {
      return successRes(res, 200, false, "Empty Testimonial List", []);
    }
    return successRes(res, 200, true, "Testimonial List", testimonialData);
  } catch (error) {
    return catchRes(res, error);
  }
};

module.exports.getHotSongList = async (req, res) => {
  try {
    // let { _id } = req.user;
    // const findUser = await User.findById(_id);
    // if (!findUser) {
    //   return successRes(res, 401, false, "User Not Found");
    // }

    const findHotSongs = await hotAlbmubModel.find().sort({ createdAt: -1 });
    if (!findHotSongs) {
      return successRes(res, 200, false, "Empty Hot Song List", []);
    }
    return successRes(res, 200, true, "Hot Song List", findHotSongs);
  } catch (error) {
    return catchRes(res, error);
  }
};

/* Comment */
module.exports.addUserComment = async (req, res) => {
  const { comment, isrc } = req.body;
  const userId = req.user._id;

  if (!comment || !isrc) {
    return successRes(res, 400, false, "All Fields are Required.");
  }

  if (comment.length > 500) {
    return successRes(res, 400, false, "Comment is Too Long.");
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return successRes(res, 401, false, "User Not Found");
    }

    const newComment = new UserComment({ comment, user: userId, isrc });
    await newComment.save();

    return successRes(res, 201, true, "Comment Added", newComment);
  } catch (error) {
    console.error("Error Adding Comment:", error);
    return catchRes(res, error);
  }
};

module.exports.getUserComments = async (req, res) => {
  const { isrc, page = 1 } = req.query;

  if (!isrc) {
    return successRes(res, 400, false, "ISRC is Required.");
  }

  const pageNumber = parseInt(page, 10);
  const limitNumber = 10;  // Fixed limit of 10 comments per page

  try {
    const totalComments = await UserComment.countDocuments({ isrc, status: "enabled" });

    if (totalComments === 0) {
      return successRes(res, 404, false, "No Comments Found for the given ISRC.");
    }

    const comments = await UserComment.find({ isrc, status: "enabled" })
      .populate("user", "firstName lastName email mobile avatar")
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .exec();

    return successRes(res, 200, true, "Users Comment List", {
      comments,
      totalComments,
      totalPages: Math.ceil(totalComments / limitNumber),
      currentPage: pageNumber,
    });
  } catch (error) {
    console.error("Error Fetching Comments:", error);
    return catchRes(res, error);
  }
};


module.exports.updateUserCommentStatus = async (req, res) => {
  const { commentId, status } = req.body;

  if (!commentId || !status) {
    return successRes(res, 400, false, "Comment ID and Status are required.");
  }

  const validStatuses = ["enabled", "disabled"];
  if (!validStatuses.includes(status)) {
    return successRes(res, 400, false, "Invalid Status Value.");
  }

  try {
    const comment = await UserComment.findById(commentId);
    if (!comment) {
      return successRes(res, 404, false, "Comment Not Found.");
    }

    comment.status = status;
    comment.updatedAt = Date.now();
    comment.deletedAt = status === "disabled" ? Date.now() : null;

    let savedComment = await comment.save();
    // console.log(savedComment);
    return successRes(res, 200, true, "Comment Status Updated.", savedComment);
  } catch (error) {
    console.error("Error Updating Comment Status:", error);
    return catchRes(res, error);
  }
};

module.exports.editUserComment = async (req, res) => {
  const { commentId, comment } = req.body;

  if (!commentId || !comment) {
    return successRes(res, 400, false, "Comment ID and Comment are required.");
  }

  if (comment.length > 500) {
    return successRes(res, 400, false, "Comment is too long.");
  }

  try {
    const existingComment = await UserComment.findById(commentId);
    if (!existingComment) {
      return successRes(res, 404, false, "Comment Not Found.");
    }

    existingComment.comment = comment;
    existingComment.updatedAt = Date.now();

    let updatedComment = await existingComment.save();
    return successRes(res, 200, true, "Comment updated.", updatedComment);
  } catch (error) {
    console.error("Error Editing Comment:", error);
    return catchRes(res, error);
  }
};

module.exports.deleteUserComment = async (req, res) => {
  const { commentId } = req.query;
  const userId = req.user._id;

  if (!commentId) {
    return successRes(res, 400, false, "Comment ID is required.");
  }

  try {
    const comment = await UserComment.findOneAndDelete({
      _id: commentId,
      user: userId,
    });

    if (!comment) {
      return successRes(
        res,
        404,
        false,
        "Comment Not Found or You are not authorized to delete this comment."
      );
    }

    return successRes(res, 200, true, "Comment Deleted Successfully.", comment);
  } catch (error) {
    console.error("Error Deleting Comment:", error);
    return catchRes(res, error);
  }
};
