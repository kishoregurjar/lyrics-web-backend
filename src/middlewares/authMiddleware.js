const jsonwebtoken = require('jsonwebtoken');
const User = require('../models/userModel');
const Admin = require('../models/adminModel');
const SECRET_KEY = process.env.JWT_SECRET;

const jwt = {
    assignJwt: (user) => {
        const payload = {
            _id: user._id,
            email: user.email,
            role: user.role
        };
        const options = {
            expiresIn: '1h'
        };
        const token = jsonwebtoken.sign(payload, SECRET_KEY, options);
        return token;
    },

    verifyUserToken: async (req, res, next) => {
        try {
            let token = req.headers.authorization
            if (!token) {
                return res.status(401).json({ message: "Access Denied: Token not provided" });
            }

            const decoded = jsonwebtoken.verify(token, SECRET_KEY);
            if (!decoded) {
                return res.status(401).json({ message: "Access Denied: Invalid Token" });
            }

            const user = await User.findById(decoded._id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (user.role !== 'user') {
                return res.status(403).json({ message: "Unauthorized: User role is not permitted" });
            }

            if (!user.isActive) {
                return res.status(403).json({ message: "User deactivated" });
            }

            req.user = user;
            next();
        } catch (error) {
            return res.status(500).json({ message: "Internal Server Error" });
        }
    },
    verifyAdminToken: async (req, res, next) => {
        try {
            let token = req.headers.authorization
            if (!token) {
                return res.status(401).json({ message: "Access Denied: Token not provided" });
            }

            const decoded = jsonwebtoken.verify(token, SECRET_KEY);
            if (!decoded) {
                return res.status(401).json({ message: "Access Denied: Invalid Token" });
            }

            const admin = await Admin.findById(decoded._id);
            if (!admin) {
                return res.status(404).json({ message: "Admin not found" });
            }

            if (admin.role !== 'admin') {
                return res.status(403).json({ message: "Unauthorized: Admin role is not permitted" });
            }

            req.user = admin;
            next();
        } catch (error) {
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
};

module.exports = jwt;
