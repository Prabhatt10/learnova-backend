const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema ({
    name : {
        type : String,
        required : true
    },
    tyoeOfLesson : {
        type : String
    },
    sublesson : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "sublesson",
            required : true
        }
    ],
    createdAt : {
        type : Date,
        default : Date.now
    }
});

module.exports = mongoose.model("lesson" , lessonSchema);0