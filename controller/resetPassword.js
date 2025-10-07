const USER = require("../model/user");
const mailSender = require("../util/mailSender");
const jwt = require('jsonwebtoken');
const OTP = require("../model/otp");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

exports.resetPasswordByOtp = async (req,res) => {
    try {
        const {email} = req.body;
        if(!email) {
            return res.status(400).json({
                success : false,
                message : "Please enter the Email and try again"
            });
        }
        const user = await USER.findOne({email});

        if(!user){
            return res.status(401).json({
                success : false,
                message : "User not found, Please SignUp first"
            });
        }

        // generate otp
        var otp = otpGenerator.generate(6,{
            upperCaseAlphabets : false,
            lowerCaseAlphabets : false,
            specialChars : false
        });

        let result = await OTP.findOne({otp});

        while(result){
            otp = otpGenerator.generate(6,{
                upperCaseAlphabets : false,
                lowerCaseAlphabets : false,
                specialChars : false
            });
            result = await OTP.findOne({otp});
        }

        console.log("otp is : ", otp);

        await OTP.findOneAndUpdate(
            {email},
            {
                otp : otp
            },
            {createdAt : Date.now()},
            {new : true}
        );

        await USER.findOneAndUpdate(
            {email}, // find user by email
            {
                resetOtp: otp,
                resetPasswordExpires: Date.now() + 5 * 60 * 1000
            },
            { new: true } // return updated doc
        );


        // send otp by mail
        try {
            const sendOtpMail = await mailSender(
                email,
                `Request to change passsword`,
                `OTP to change password is : ${otp}`
            );
        } catch (error) {
            return res.status(200).json({
                success : false,
                message : "Error in sending otp"
            });
        }

        // const sendOtpMail = await mailSender(
        //     email,
        //     `Request to change passsword`,
        //     `OTP to change password is : ${otp}`
        // );

        return res.status(200).json({
            success : false,
            message : "Otp for changing passsword send successfully"
        });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success : false,
            message : 'Password reset link cannot sent, Please Try again'
        });
    }
}

exports.resetPasswordByToken = async (req,res) => {
    try {
        const { email, otp } = req.body;

        if (!email) {
            return res.status(400).json({
                success : false,
                message : "Please enter the Email and try again"
            });
        }

        const user = await USER.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success : false,
                message : "User not found, Please SignUp first"
            });
        }

        const token = crypto.randomBytes(20).toString("hex");

        const updatedDetails = await USER.findOneAndUpdate(
            { email: email },
            {
                token: token,
                resetPasswordExpires: Date.now() + 5*60*1000
            },
            { new: true }
        );

        // frontend url - update as needed
        const url = `http://localhost:3000/update-password/${token}`;

        await mailSender(
            email,
            "Password reset Link",
            `Password Reset Link : ${url}`
        );

        return res.status(200).json({
            success : true,
            message : "Email sent to update Password"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success : false,
            message : 'Password reset link could not be sent, Please try again'
        });
    }
}

exports.resetPassword = async (req,res) => {
    try {
        const {email,otp,newPassword} = req.body;

        if(!email || !newPassword || !otp){
            return res.status(401).json({
                success : false,
                message : "All fileds are required"
            });
        }

        const userDetails = await USER.findOne({email});

        if (!userDetails) {
            return res.json({
                success: false,
                message: "User not found",
            });
        }

        if (!userDetails.resetOtp || userDetails.resetOtp !== String(otp)) {
            return res.json({
                success: false,
                message: "Invalid OTP",
            });
        }

        if (!userDetails.resetPasswordExpires || userDetails.resetPasswordExpires < Date.now()) {
            return res.json({
                success: false,
                message: "OTP has expired. Please request a new one.",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword,salt);

        await USER.findOneAndUpdate(
            { email },
            {
                password: hashedPassword,
                resetOtp: "",
                resetPasswordExpires: 0
            },
            { new: true }
        );


        return res.status(200).json({
            success: true,
            message: "Password reset successful. You can now log in with your new password.",
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success : false,
            message : "Error while resetting password"
        });
    }
}