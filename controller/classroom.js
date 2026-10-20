const mongoose = require("mongoose");
const USER = require("../model/user");
const CLASSROOM = require("../model/classroom");
const FILE = require("../model/file");
require("../model/lesson");

exports.createClassroom = async (req,res) => {
    try {
        const userID = req.user.id;
        const { className , subjectName , subjectCode , privacy } = req.body;
        if(!className || !subjectName || !subjectCode || !privacy){
            return res.status(400).json({
                success : false,
                message : "Enter all fields to create the classroom"
            });
        }
        
        const userDetails = await USER.findById(userID);

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        let isDuplicate = true;
        const length = 6; // or whatever length you want

        while (isDuplicate) {
            // generate new code
            code = '';
            for (let i = 0; i < length; i++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
            }

            // check if code exists
            const checkCodeAlreadyExists = await CLASSROOM.findOne({ classJoinCode : code });
            if (!checkCodeAlreadyExists) {
                isDuplicate = false;
            }
        }

        console.log("Unique Classroom Code:", code);

        // Build class URL (you can replace localhost:5000 with your frontend or API domain)
        const classUrl = `${req.protocol}://${req.get("host")}/classroom/join/${code}`;

        console.log("Class URl : ",classUrl);

        const newClassroom = await CLASSROOM.create ({
            className ,
            subjectName,
            subjectCode,
            privacy : privacy,
            instructor : userDetails._id,
            classJoinCode : code,
            classUrl : classUrl,
        });

        // add classroom to user schema
        await USER.findByIdAndUpdate(
            userDetails._id,
            {
                $push : {
                    classroom : newClassroom._id
                }
            },
            {new : true}
        );

        return res.status(200).json({
            success : true,
            message : "New course created successfully and User updated with the new classroom details"
        });


    } 
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success : false,
            message : "Classroom cannot be created at a moment, Please try again"
        });
    }
}

exports.updateClassroom = async(req,res) => {
    try{
        const {className, subjectCode,subjectName,privacy} = req.body;
        const userID = req.user.id;
        const {id} = req.params;

        const classroom = await CLASSROOM.findById(id);
        if(!classroom){
            return res.status(401).json({
                success : false,
                message : "Can't find classroom"
            });
        }
        if ( classroom.instructor.toString() !== userID.toString() ) {
            return res.status(401).json({
                success : false,
                message : "Not Authorized to update the details"
            });
        }

        if (className) classroom.className = className;
        if (subjectCode) classroom.subjectCode = subjectCode;
        if (subjectName) classroom.subjectName = subjectName;
        if (privacy) classroom.privacy = privacy;

        await classroom.save();
        
        return res.status(200).json({
            success: true,
            message: "Classroom updated successfully",
            classroom,
        });
    } catch(error){
        console.log(error)
        return res.status(500).json({
            success : false,
            message : "Classroom cannot be updated"
        });
    }
}

exports.deleteClassroom = async (req, res) => {
    try {
        const classroomId = req.params.id;   // ✅ classroom id from URL
        const userId = req.user.id;          // ✅ user id from JWT

        console.log("Classroom ID:", classroomId);
        console.log("User ID:", userId);

        const classroom = await CLASSROOM.findById(classroomId);

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: "Cannot find classroom",
            });
        }

        if (classroom.instructor.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized for this action",
            });
        }

        for (const studentID of classroom.studentEnrolled) {
            await USER.findByIdAndUpdate(
                studentID,
                { $pull: { classroom: classroomId } },
                { new: true }
            );
        }

        await CLASSROOM.findByIdAndDelete(classroomId);

        return res.status(200).json({
            success: true,
            message: "Classroom deleted successfully",
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Classroom cannot be deleted at this moment, please try again later",
        });
    }
};

exports.findClassroomByClassCode = async (req,res) => {
    try {
        const code = req.params.code || req.query.code || req.body?.code;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Classroom code is required",
            });
        }

        const classroom = await CLASSROOM.findOne({ classJoinCode: code })
            .populate("instructor", "userName email")
            .populate("studentEnrolled", "userName email");
        
        if(!classroom){
            return res.status(404).json({
                success : false,
                message : "No classroom found with the given code"
            });
        }
        
        return res.status(200).json({
            success: true,
            message: "Classroom fetched successfully",
            classroom,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success : false,
            message : "Cannot get classroom at this moment by the given code"
        });
    }
}

exports.joinClassroom = async (req,res) => {
    try {
        const userID = req.user.id;
        const {code} = req.body;

        if(!code){
            return res.status(400).json({
                success : false,
                message : "Classroom code is required to join"
            });
        }

        const classroom = await CLASSROOM.findOne({classJoinCode : code});

        if(!classroom){
            return res.status(404).json({
                success : false,
                message : "Classroom not found with the given code"
            });
        }

        if (classroom.instructor && classroom.instructor.toString() === userID.toString()) {
            return res.status(400).json({
                success : false,
                message : "You are the instructor of this classroom"
            });
        }

        const isAlreadyEnrolled = classroom.studentEnrolled.some(
            (id) => id.toString() === userID.toString()
        );

        if(isAlreadyEnrolled){
            return res.status(400).json({
                success : false,
                message : 'You already joined the classroom'
            });
        }

        if(classroom.privacy === "anyone") {
            await CLASSROOM.findByIdAndUpdate(
                classroom._id,
                {
                    $addToSet: { 
                        studentEnrolled: userID 
                    }
                },
                { new: true }
            );

            await USER.findByIdAndUpdate(
                userID,
                {
                    $addToSet : {
                        classroom : classroom._id
                    }
                },
                {new : true}
            );

            return res.status(200).json({
                success : true,
                message : "Classroom joined successfully",
                classroom
            });

        } 
        else if(classroom.privacy === "approved"){
            const isAlreadyRequested = classroom.pendingRequests.some(
                (id) => id.toString() === userID.toString()
            );

            if(isAlreadyRequested){
                return res.status(400).json({
                    success : false,
                    message : "You already requested to join this classroom"
                });
            }

            await CLASSROOM.findByIdAndUpdate(
                classroom._id,
                {
                    $addToSet : {
                        pendingRequests : userID
                    }
                },
                {new : true}
            );

            return res.status(200).json({
                success: true,
                message: "Request sent to instructor for approval"
            });
        }

        return res.status(200).json({
            success : true,
            message : "Classroom joined successfully",
            classroom
        });
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success : false,
            message : "Cannot join class at this moment, Please try again later"
        });
    }
}

exports.leaveClassroom = async (req,res) => {
    try {
        const {id} = req.params;
        const userID = req.user.id;

        const classroom = await CLASSROOM.findById(id);

        if(!classroom){
            return res.status(400).json({
                success : false,
                message : "Classroom not found"
            });
        }

        if(!classroom.studentEnrolled.includes(userID)){
            return res.status(400).json({
                success : false,
                message : "You are not enrolled in this classroom"
            });
        }

        await CLASSROOM.findByIdAndUpdate(
            id,
            {
                $pull : {
                    studentEnrolled : userID
                }
            },
            {new : true}
        );

        await USER.findByIdAndUpdate(
            userID,
            {
                $pull : {
                    classroom : id
                }
            },
            {new : true}
        );

        return res.status(200).json({
            success : true,
            message : "Successfully leaved classroom"
        });
    } catch (error) {
        console.log(error);
        return res.status(404).json({
            success : false,
            message : "Error while leaving classroom, Please try again after some time"
        });
    }
}

// tested

exports.acceptRequest = async (req,res) => {
    try {
        const id = req.params.id || req.body.classroomId || req.body.id;
        const {userID} = req.body;
        const instructorID = req.user.id;

        if (!id || !userID) {
            return res.status(400).json({
                success: false,
                message: "Classroom ID and User ID are required"
            });
        }

        const classroom = await CLASSROOM.findById(id);
        if(!classroom){
            return res.status(404).json({
                success : false,
                message : "Classroom not found"
            });
        }

        if(classroom.instructor.toString() !== instructorID.toString()){
            return res.status(403).json({
                success : false,
                message : "You are not authorized to accept the request"
            });
        }

        const isRequested = classroom.pendingRequests.some(
            reqId => reqId.toString() === userID.toString()
        );

        if(!isRequested){
            return res.status(400).json({
                success: false,
                message : "User request not found in pending requests"
            });
        }

        const updatedClassroom = await CLASSROOM.findByIdAndUpdate(
            id,
            {
                $pull : {
                    pendingRequests : userID
                },
                $addToSet : {
                    studentEnrolled : userID
                },
            },
            {new : true}
        );

        await USER.findByIdAndUpdate(
            userID,
            {
                $addToSet : {
                    classroom : id,
                }
            },
            {new : true}
        );

        return res.status(200).json({
            success : true,
            message : "User request accepted successfully",
            classroom: updatedClassroom
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success : false,
            message : "Error in accepting request, Please try again later"
        });
    }
}

exports.declineRequest = async (req,res) => {
    try {
        const id = req.params.id || req.body.classroomId || req.body.id;
        const {userID} = req.body;
        const instructorID = req.user.id;

        if (!id || !userID) {
            return res.status(400).json({
                success: false,
                message: "Classroom ID and User ID are required"
            });
        }

        const classroom = await CLASSROOM.findById(id);
        if(!classroom){
            return res.status(404).json({
                success : false,
                message : "Classroom not found"
            });
        }

        if(classroom.instructor.toString() !== instructorID.toString()){
            return res.status(403).json({
                success : false,
                message : "You are not authorized to decline the request"
            });
        }

        const isRequested = classroom.pendingRequests.some(
            reqId => reqId.toString() === userID.toString()
        );

        if(!isRequested){
            return res.status(400).json({
                success: false,
                message : "User request not found in pending requests"
            });
        }

        const updatedClassroom = await CLASSROOM.findByIdAndUpdate(
            id,
            {
                $pull : {
                    pendingRequests : userID
                },
            },
            {new : true}
        );

        return res.status(200).json({
            success : true,
            message : "Request declined successfully",
            classroom: updatedClassroom
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success : false,
            message : "Error in declining request, Please try again later"
        });
    }
}

exports.removeStudent = async(req,res) => {
    try {
        const id = req.params.id || req.body.classroomId || req.body.id;
        const instructorID = req.user.id;
        const {studentID} = req.body;

        if (!id || !studentID) {
            return res.status(400).json({
                success: false,
                message: "Classroom ID and Student ID are required"
            });
        }

        const classroom = await CLASSROOM.findById(id);

        if(!classroom){
            return res.status(404).json({
                success : false,
                message : "Classroom not found"
            });
        }

        if(classroom.instructor.toString() !== instructorID.toString()){
            return res.status(403).json({
                success : false,
                message : "You are not authorized to perform this task"
            });
        }

        const isEnrolled = classroom.studentEnrolled.some(
            sId => sId.toString() === studentID.toString()
        );

        if(!isEnrolled){
            return res.status(400).json({
                success : false,
                message : "User is not a member of this classroom"
            });
        }

        const updatedClassroom = await CLASSROOM.findByIdAndUpdate(
            id,
            {
                $pull : {
                    studentEnrolled : studentID
                }
            },
            {new:true}
        );

        await USER.findByIdAndUpdate(
            studentID,
            {
                $pull : {
                    classroom : id
                }
            },
            {new : true}
        );

        return res.status(200).json({
            success : true,
            message : "User removed successfully",
            classroom: updatedClassroom
        });
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success : false,
            message : "Error while removing student"
        });
    }
}

exports.getUserClassrooms = async (req, res) => {
    try {
        const userID = req.user.id;

        const instructedClassrooms = await CLASSROOM.find({ instructor: userID })
            .populate("instructor", "userName email")
            .populate("studentEnrolled", "userName email");

        const enrolledClassrooms = await CLASSROOM.find({ studentEnrolled: userID })
            .populate("instructor", "userName email")
            .populate("studentEnrolled", "userName email");

        return res.status(200).json({
            success: true,
            instructedClassrooms,
            enrolledClassrooms,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user classrooms",
        });
    }
};

exports.getClassroomById = async (req, res) => {
    try {
        const { id } = req.params;
        const userID = req.user.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid classroom ID",
            });
        }

        let query = CLASSROOM.findById(id)
            .populate("instructor", "userName email")
            .populate("studentEnrolled", "userName email")
            .populate("pendingRequests", "userName email");

        if (mongoose.models.lesson) {
            query = query.populate("lesson");
        }

        const classroom = await query;

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: "Classroom not found",
            });
        }

        const isInstructor =
            classroom.instructor?._id?.toString() === userID.toString() ||
            classroom.instructor?.toString() === userID.toString();

        const isEnrolled = (classroom.studentEnrolled || []).some(
            s => (s._id?.toString() || s.toString()) === userID.toString()
        );

        if (!isInstructor && !isEnrolled) {
            return res.status(403).json({
                success: false,
                message: "You are not enrolled in or authorized to view this classroom",
            });
        }

        return res.status(200).json({
            success: true,
            classroom,
            isInstructor,
        });
    } catch (error) {
        console.error("getClassroomById error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch classroom details",
        });
    }
};

const cloudinary = require("cloudinary").v2;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

exports.getClassroomFiles = async (req, res) => {
    try {
        const { id } = req.params;
        const userID = req.user.id;

        const classroom = await CLASSROOM.findById(id);
        if (!classroom) {
            return res.status(404).json({ success: false, message: "Classroom not found" });
        }

        const isInstructor = classroom.instructor.toString() === userID.toString();
        const isEnrolled = classroom.studentEnrolled.some(s => s.toString() === userID.toString());

        if (!isInstructor && !isEnrolled) {
            return res.status(403).json({ success: false, message: "Not authorized to view files" });
        }

        const files = await FILE.find({ classroom: id })
            .populate("uploadedBy", "userName email")
            .sort({ uploadedAt: -1 });

        return res.status(200).json({ success: true, files });
    } catch (error) {
        console.error("Fetch files error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch files" });
    }
};

exports.uploadClassroomFile = async (req, res) => {
    try {
        const { id } = req.params;
        const userID = req.user.id;
        const { fileName, fileType, fileUrl, fileBase64 } = req.body;

        const classroom = await CLASSROOM.findById(id);
        if (!classroom) {
            return res.status(404).json({ success: false, message: "Classroom not found" });
        }

        const isInstructor = classroom.instructor.toString() === userID.toString();
        const isEnrolled = classroom.studentEnrolled.some(s => s.toString() === userID.toString());

        if (!isInstructor && !isEnrolled) {
            return res.status(403).json({ success: false, message: "Not authorized to upload files" });
        }

        if (!fileName) {
            return res.status(400).json({ success: false, message: "File name is required" });
        }

        let finalUrl = fileUrl;

        // If fileBase64 is provided and Cloudinary is configured
        if (fileBase64 && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
            try {
                const uploadResult = await cloudinary.uploader.upload(fileBase64, {
                    folder: `learnova/classroom_${id}`,
                    resource_type: "auto",
                });
                finalUrl = uploadResult.secure_url;
            } catch (cloudErr) {
                console.warn("Cloudinary upload failed, falling back to direct URL:", cloudErr.message);
            }
        }

        if (!finalUrl) {
            finalUrl = "https://via.placeholder.com/300";
        }

        const validTypes = ["image", "audio", "pdf", "doc", "ppt", "other"];
        const validFileType = validTypes.includes(fileType) ? fileType : "other";

        const newFile = await FILE.create({
            classroom: id,
            uploadedBy: userID,
            fileUrl: finalUrl,
            fileName,
            fileType: validFileType,
        });

        const populatedFile = await FILE.findById(newFile._id).populate("uploadedBy", "userName email");

        return res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            file: populatedFile,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({ success: false, message: "Failed to upload file" });
    }
};

exports.deleteClassroomFile = async (req, res) => {
    try {
        const { id, fileId } = req.params;
        const userID = req.user.id;

        const file = await FILE.findById(fileId);
        if (!file) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        const classroom = await CLASSROOM.findById(id);
        if (!classroom) {
            return res.status(404).json({ success: false, message: "Classroom not found" });
        }

        const isInstructor = classroom.instructor.toString() === userID.toString();
        const isUploader = file.uploadedBy.toString() === userID.toString();

        if (!isInstructor && !isUploader) {
            return res.status(403).json({ success: false, message: "Not authorized to delete this file" });
        }

        await FILE.findByIdAndDelete(fileId);

        return res.status(200).json({
            success: true,
            message: "File deleted successfully",
        });
    } catch (error) {
        console.error("Delete file error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete file" });
    }
};
