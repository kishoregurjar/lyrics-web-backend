const { assignJwt } = require("../middlewares/authMiddleware");
const User = require("../models/userModel");
const { catchRes, successRes, SwrRes, swrRes } = require("../utils/response");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { genericMail } = require("../utils/sendMail");
const jwt = require("jsonwebtoken");
const Feedback = require("../models/reviewsModel");
const Testimonial = require("../models/testimonialModel");
const { USER_AVATAR } = require("../utils/constants");

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
      avatar
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

    return successRes(res, 200, true, "User profile updated successfully.", user);
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
