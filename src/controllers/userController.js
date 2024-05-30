const User = require("../models/userModel");
const { catchRes, successRes, swrRes } = require("../utils/response");
const bcrypt = require('bcryptjs');

module.exports.createUser = async (req, res, next) => {
    let { firstName, lastName, email, password, mobile } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return catchRes(res, "User with this email already exists.");
        }
        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            mobile
        });

        let user = await newUser.save();
        if (!user) {
            return swrRes(res)
        }

        return successRes(res, 201, true, "User created successfully.", newUser);

    } catch (error) {
        return catchRes(res, error);
    }
};
