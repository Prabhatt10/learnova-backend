const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.auth = async (req, res, next) => {
  try {
    // Get token from body, cookies or Authorization header
    const token =
      req.body.token ||
      req.cookies?.token ||
      (req.header("Authorization") &&
        req.header("Authorization").replace("Bearer ", "").trim());

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decode is : ", decoded);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Token is invalid",
      });
    }

    // Normalize payload → always ensure req.user.id is available
    // if (decoded.id) {
    //   req.user = { id: decoded.id };
    // } else if (decoded._id) {
    //   req.user = { id: decoded._id };
    // } else if (decoded.user && decoded.user.id) {
    //   req.user = { id: decoded.user.id };
    // } else if (decoded.user && decoded.user._id) {
    //   req.user = { id: decoded.user._id };
    // } else if (decoded.userId) {   // 🔥 add this
    //   req.user = { id: decoded.userId };
    // } else {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Invalid token payload",
    //   });
    // }

    req.user = { id: decoded.id || decoded._id || decoded.userId || decoded.user._id };

    console.log("ID in auth middleware is : ",req.user._id);

    if (!req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Token payload missing user id",
      });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
