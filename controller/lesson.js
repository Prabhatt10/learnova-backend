const USER = require("../model/user");
const SUBLESSON = require("../model/sublesson");
const LESSON = require("../model/lesson");
const FILE = require("../model/file");
const CLASSROOM = require("../model/classroom");

exports.createLesson = async (req,res) => {
    try {
        const {name,typeOfLesson} = req.body;
        const {userID} = req.user.id;
        
        if(!name){
            return res.status(401).json({
                success : false,
                message : "Name of lesson is requires;"
            });
        }
        
        // add new sublesson to the sublesson section
        const newLesson = await LESSON.create({
            name,
            typeOfLesson,
            createdAt : Date.now()
        });

        return res.status(200).json({
            success : true,
            message : "Lesson is created succcessfully"
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success : false,
            message : "Error in creating Lesson",
            message : error.message
        });
    }
}

