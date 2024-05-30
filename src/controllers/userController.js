const User = require("../models/userModel");
const { catchRes, successRes, SwrRes } = require("../utils/response");
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

module.exports.createUser = async (req, res, next) => {
    let { firstName, lastName, email, password, mobile } = req.body;

    // Input validation (you can use a library like Joi for more robust validation)
    if (!firstName || !lastName || !email || !password || !mobile) {
        return catchRes(res, "All fields are required.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Check if user already exists
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

        return successRes(res, 201, true, "User created successfully.", newUser);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return catchRes(res, error);
    }
};
