const USER = require("../model/user");
const OTP = require("../model/otp");
const otpGenerator = require("otp-generator");
const mailSender = require("../util/mailSender");
const bcrypt = require("bcrypt");
const {generateAccessToken , generateRefreshToken} = require("../util/token");
require("dotenv").config();
const jwt = require("jsonwebtoken");



// signup
exports.signUp = async (req,res) => {
    try{
        const {userName , email , password , confirmPassword , otp} = req.body
        if(!userName || !email || !password || !confirmPassword) {
            return res.status(401).json({
                success : false,
                message : "All fields are required,Please try Again"
            });
        }
        if(password != confirmPassword){
            return res.status(403).json({
                success : false,
                message : "Password did't matched"
            });
        }

        const existingUser = await USER.findOne({email});

        if(existingUser){
            return res.status(403).json({
                success : false,
                message : "User already exists"
            });
        }

        // find most recent OTP
        const recentOTP = await OTP.findOne({ email }).sort({ createdAt: -1 });

        if (!recentOTP) {
            return res.status(400).json({
                success: false,
                message: "OTP not found"
            });
        }

        // console.log("otp :" , otp),
        // console.log("recent otp : ", recentOTP.otp);

        if (String(otp).trim() !== String(recentOTP.otp).trim()) {
            return res.status(400).json({
                success: false,
                message: "Wrong OTP, Please enter correct OTP"
            });
        }


        const hashedPassword = await bcrypt.hash(password,10);

        // create entry in DB 

        const user = await USER.create({
            userName,
            email, 
            password : hashedPassword,
            isAccountVerified: true,
        });

        // create token, refresh token and access token 
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );
        const refreshToken = await generateRefreshToken(user._id);
        const accessToken = await generateAccessToken(user._id);

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        };

        // Save tokens in cookies
        res.cookie("token", token, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
        res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        // send welcome email (non-blocking if mail service fails)
        try {
            await mailSender(
                email,
                "Honour to onboard your Learning journey",
                `Welcome ${userName} to LearnOva! We are glad to have you on board.`
            );
        } catch (mailError) {
            console.error("Welcome email could not be sent:", mailError.message);
        }

        user.password = undefined;

        return res.status(200).json({
            success : true,
            message : "User registered successfully",
            token,
            accessToken,
            refreshToken,
            user
        });

    }
    catch(error){
        console.error("Error in registration:", error);
        return res.status(500).json({
            success : false,
            message : "Error during registration, please try again"
        });
    }
}

// registration OTP
exports.sendRegistrationOtp = async (req,res) => {
    try{
        const {email} = req.body;
        const checkUserPresent = await USER.findOne({email});

        if (checkUserPresent) {
            if (checkUserPresent.isAccountVerified) {
                return res.status(400).json({
                    success: false,
                    message: "Account is already verified",
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: "User already present, cannot send registration OTP",
                });
            }
        }


        // generate otp
        var otp = otpGenerator.generate(6,{
            upperCaseAlphabets : false,
            lowerCaseAlphabets : false,
            specialChars: false,
        });

        let result = await OTP.findOne({otp});

        while(result){
            otp = otpGenerator.generate(6,{
                upperCaseAlphabets : false,
                lowerCaseAlphabets : false,
                specialChars: false,
            });
            result = await OTP.findOne({otp});
        }

        console.log("this is the otp : " ,otp);

        await OTP.create({ email, otp });

        try {
            await mailSender(
                email,
                "Registration Confirmation OTP",
                `Enter this OTP to confirm Registration ${otp}`
            );
        } catch (_error) {
            return res.status(404).json({
                success : false,
                message : "Can't send OTP, Please try again later"
            });
        }

        // const registrationMail = await mailSender(
        //     email,
        //     "Registration Confirmation OTP",
        //     `Enter this OTP to confirm Registration ${otp}`
        // );

        return res.status(200).json({
            success : true,
            message : "OTP sent successfully",
            // otp
        });


    } catch(error){
        console.log(error);
        return res.status(500).json({
            success : false,
            message : "error in sending OTP"
        });
    }
}

exports.login = async (req,res) => {
    try {
        // get data
        const {email,password} = req.body;

        // validation
        if(!email || !password){
            return res.status(400).json({
                success : false,
                message : "Enter Email and password to login"
            });
        }

        const user = await USER.findOne({email});

        if (!user) {
            return res.json({
                success: false,
                message: "User not found with this email, Please complete the registration",
            });
        }

        const compareUserPassword = await bcrypt.compare(password,user.password);

        if(!compareUserPassword){
            return res.status(401).json({
                success : false,
                message : "Invalid Paswword, Please try again"
            });
        }

        // generate token and store in cookie
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        const accessToken = await generateAccessToken(user._id);
        const refreshToken = await generateRefreshToken(user._id);

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        };

        res.cookie("token", token, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
        res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        user.password = undefined;

        return res.status(200).json({
            success : true,
            message : "User logged in successfully",
            refreshToken,
            accessToken,
            token,
            user
        });


    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success : false,
            message : error.message || "Internal server error while login, please try again"
        });
    }
}

const SETTING = require("../model/setting");

exports.getUserProfile = async (req, res) => {
    try {
        const userID = req.user.id;
        const user = await USER.findById(userID).select("-password").populate("additionalDetails");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Get profile error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch profile" });
    }
};

exports.updateUserProfile = async (req, res) => {
    try {
        const userID = req.user.id;
        const { userName, bio, contactNumber, profileImage } = req.body;

        const user = await USER.findById(userID);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (userName) user.userName = userName.trim();
        await user.save();

        let setting = null;
        if (user.additionalDetails) {
            setting = await SETTING.findById(user.additionalDetails);
        }

        if (!setting) {
            setting = await SETTING.create({
                user: userID,
                bio: bio || "",
                contactNumber: contactNumber || "",
                profileImage: profileImage || "",
            });
            user.additionalDetails = setting._id;
            await user.save();
        } else {
            if (bio !== undefined) setting.bio = bio;
            if (contactNumber !== undefined) setting.contactNumber = contactNumber;
            if (profileImage !== undefined) setting.profileImage = profileImage;
            await setting.save();
        }

        const updatedUser = await USER.findById(userID).select("-password").populate("additionalDetails");

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({ success: false, message: "Failed to update profile" });
    }
};

