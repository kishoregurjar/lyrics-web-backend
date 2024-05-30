const { assignJwt } = require("../middlewares/authMiddleware");
const User = require("../models/userModel");
const { catchRes, successRes, SwrRes } = require("../utils/response");
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { genericMail } = require("../utils/sendMail");
const jwt = require('jsonwebtoken');

module.exports.createUser = async (req, res, next) => {
    let { firstName, lastName, email, password, mobile } = req.body;
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
            return successRes(res, 409, false, "User with this email already exists.", null);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            mobile
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
            role: 'user'
        });
        const verifyLink = `${process.env.VERIFY_LINK}/${token}`
        genericMail(email, user.firstName, verifyLink, 'welcome')
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
            role: 'user'
        });

        const userObj = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            mobile: user.mobile,
            isVerified: user.isVerified,
            isActive: user.isActive,
            token: token
        };

        return successRes(res, 200, true, "Login successful", userObj);
    } catch (error) {
        return catchRes(res, error);
    }
};

module.exports.showUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('-password -__v -createdAt -updatedAt');

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


