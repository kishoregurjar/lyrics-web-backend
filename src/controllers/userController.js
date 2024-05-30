const { assignJwt } = require("../middlewares/authMiddleware");
const User = require("../models/userModel");
const { catchRes, successRes, SwrRes } = require("../utils/response");
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

module.exports.createUser = async (req, res, next) => {
    let { firstName, lastName, email, password, mobile } = req.body;

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
        return successRes(res, 201, true, "User created successfully.", null);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return catchRes(res, error);
    }
};

module.exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

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
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


