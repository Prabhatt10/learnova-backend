const mongoose = require("mongoose");

const classroomSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true
    },
    subjectCode: {
        type: String,
        required: true
    },
    subjectName: {
        type: String,
        required: true
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    studentEnrolled: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }],
    privacy: {
        type: String,
        enum: ["anyone", "approved"],
        default: "anyone"
    },
    lesson: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "lesson"
    }],
    quiz: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "quiz"
    }],
    favourite: {
        type: Boolean,
        default: false
    },
    classJoinCode: {
        type: String,
        required: true
    },
    classUrl: {
        type: String,
        required: true
    },
    pendingRequests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("classroom", classroomSchema);
