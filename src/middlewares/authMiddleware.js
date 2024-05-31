const jsonwebtoken = require("jsonwebtoken");
const User = require("../models/userModel");
const Admin = require("../models/adminModel");
const SECRET_KEY = process.env.JWT_SECRET;
const MAX_SESSION_DURATION = 60 * 60 * 1000;

const jwt = {
  assignJwt: (user) => {
    const payload = {
      _id: user._id,
      email: user.email,
      role: user.role,
    };
    const options = {
      expiresIn: "1h",
    };
    const token = jsonwebtoken.sign(payload, SECRET_KEY, options);
    return token;
  },

  verifyUserToken: async (req, res, next) => {
    try {
      let token = req.headers.authorization;
      if (!token) {
        return res
          .status(401)
          .json({ message: "Access Denied: Token not provided" });
      }

      let decoded;
      try {
        decoded = jsonwebtoken.verify(token, SECRET_KEY);
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return res
            .status(401)
            .json({ message: "Session timeout: Please login again" });
        }
        return res
          .status(401)
          .json({ message: "Access Denied: Invalid Token" });
      }

      if (!decoded) {
        return res
          .status(401)
          .json({ message: "Access Denied: Invalid Token" });
      }

      const user = await User.findById(decoded._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentTime = new Date();
      if (
        user.lastApiHitTime &&
        currentTime - user.lastApiHitTime >= MAX_SESSION_DURATION
      ) {
        return res
          .status(401)
          .json({ message: "Session timeout: Please login again" });
      }

      if (user.role !== "user") {
        return res
          .status(403)
          .json({ message: "Unauthorized: User role is not permitted" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "User deactivated" });
      }

      user.lastApiHitTime = currentTime;
      await user.save();

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },
  verifyAdminToken: async (req, res, next) => {
    try {
      let token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access Denied: Token Not Provided",
        });
      }

      const decoded = jsonwebtoken.verify(token, SECRET_KEY);
      if (!decoded) {
        return res
          .status(401)
          .json({ success: false, message: "Access Denied: Invalid Token" });
      }

      const admin = await Admin.findById(decoded._id);
      if (!admin) {
        return res
          .status(404)
          .json({ success: false, message: "Admin Not Found" });
      }

      if (admin.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Admin Role is Permitted Only",
        });
      }

      req.user = admin;
      next();
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error", error });
    }
  },
};

module.exports = jwt;
