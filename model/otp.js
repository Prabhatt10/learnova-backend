const mongoose = require("mongoose");
const mailSender = require("../util/mailSender");
const emailVerificationTemplate = require("../mailTemplate/verification");

const otpSchema = new mongoose.Schema ({
    email : {
        type : String,
        required : true
    },
    otp : {
        type : String,
        required : true
    },
    createdAt : {
        type : Date,
        default : Date.now,
        expires : 5 * 60 
    },
},
{ timestamps: true }); 

async function sendVerificationEmail(email, otp) {
    try {
        await mailSender(
            email,
            "Verification Email",
            emailVerificationTemplate(otp)
        );
        console.log("Email sent successfully");
    } catch (error) {
        console.error("Error sending verification email:", error.message);
        throw error;
    }
}

const OTP = mongoose.model("otp", otpSchema);
OTP.sendVerificationEmail = sendVerificationEmail;

module.exports = OTP;