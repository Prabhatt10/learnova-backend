const express = require("express");
const router = express.Router();

const {signUp,sendRegistrationOtp,login} = require("../controller/auth");
const {resetPasswordByOtp , resetPassword ,resetPasswordByToken} = require("../controller/resetPassword");


router.post("/signup",signUp);
router.post("/sendRegistrationOtp",sendRegistrationOtp);
router.post("/login",login);
router.post("/resetPasswordByOtp",resetPasswordByOtp);
router.post("/resetPassword",resetPassword);
router.post("/resetPasswordByToken",resetPasswordByToken);

module.exports = router;