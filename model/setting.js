const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    bio: {
        type: String,
        default: ""
    },
    profileImage: {
        type: String,
        default: ""
    },
    contactNumber: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model("setting", settingSchema);
