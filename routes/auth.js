const express = require("express");
const router = express.Router();

const {signUp, sendRegistrationOtp, login, getUserProfile, updateUserProfile} = require("../controller/auth");
const {resetPasswordByOtp, resetPassword, resetPasswordByToken} = require("../controller/resetPassword");
const {auth} = require("../middleware/authMiddleware");

router.post("/signup", signUp);
router.post("/sendRegistrationOtp", sendRegistrationOtp);
router.post("/login", login);
router.post("/resetPasswordByOtp", resetPasswordByOtp);
router.post("/resetPassword", resetPassword);
router.post("/resetPasswordByToken", resetPasswordByToken);

// Authenticated user profile routes
router.get("/me", auth, getUserProfile);
router.put("/updateProfile", auth, updateUserProfile);

module.exports = router;