const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema ({
    classroom : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "classroom",
        required : true
    },
    uploadedBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "user",
        required : true
    },
    fileUrl : {
        type : String,
        required : true,
    },
    fileName : {
        type : String,
        required : true,
    },
    fileType : {
        type : String,
        enum : ["image","audio","pdf","doc","ppt","other"],
        required : true
    },
    uploadedAt : {
        type : Date,
        default : Date.now
    }
});

module.exports = mongoose.model("file",fileSchema);