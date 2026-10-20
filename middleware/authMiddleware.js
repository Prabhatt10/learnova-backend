const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.auth = async (req, res, next) => {
  try {
    // Get token from cookies, Authorization header, or body
    const token =
      req.cookies?.token ||
      req.cookies?.accessToken ||
      (req.header("Authorization") &&
        req.header("Authorization").replace("Bearer ", "").trim()) ||
      req.body?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing",
      });
    }

    // Verify token with JWT_SECRET (fallback to ACCESS_SECRET if available)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_err) {
      if (process.env.ACCESS_SECRET) {
        try {
          decoded = jwt.verify(token, process.env.ACCESS_SECRET);
        } catch (_innerErr) {
          return res.status(401).json({
            success: false,
            message: "Token is invalid or expired",
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: "Token is invalid or expired",
        });
      }
    }

    // Safely extract user ID from decoded payload
    const userId =
      decoded?.id ||
      decoded?._id ||
      decoded?.userId ||
      decoded?.user?._id ||
      decoded?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Token payload missing user id",
      });
    }

    req.user = {
      ...decoded,
      id: userId.toString(),
      _id: userId.toString(),
    };

    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
