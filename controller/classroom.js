const USER = require("../model/user");
const CLASSROOM = require("../model/classroom");
const FILE = require("../model/file");
const user = require("../model/user");

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
        const {code} = req.params;

        const classroom = await CLASSROOM.findOne(code)
                                                    .populate("instructor")
                                                    .populate("studentEnrolled");
        
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
        console.log(error);
        return res.status(404).json({
            success : false,
            message : "cannot get classroom at this moment by the given code"
        })
    }
}

exports.joinClassroom = async (req,res) => {
    try {
        const userID = req.user.id;
        const {code} = req.body;

        if(!code){
            return res.status(404).json({
                success : false,
                message : "Classroom code is required to join"
            });
        }

        const classroom = await CLASSROOM.findOne({classJoinCode : code});

        if(!classroom){
            return res.status(404).json({
                success : false,
                message : "Classroom can't find with the given code"
            });
        }

        if(classroom.studentEnrolled.includes(userID)){
            return res.status(400).json({
                success : false,
                message : 'You already joined the classroom'
            });
        }

        if(classroom.privacy === "anyone") {
            await CLASSROOM.findByIdAndUpdate(
                classroom._id,
                {
                    $push: { 
                        studentEnrolled: userID 
                    }
                },
                { new: true }
            );

            console.log("classroom is : ",classroom.studentEnrolled);

            await USER.findByIdAndUpdate(
                userID,
                {
                    $push : {
                        classroom : classroom._id
                    }
                },
                {new : true}
            );

        } 
        else if(classroom.privacy === "approved"){

            if(classroom.pendingRequests.includes(userID)){
                return res.status(400).json({
                    success : false,
                    message : "You already requsted for the classroom"
                });
            }

            await CLASSROOM.findOneAndUpdate(
                classroom,
                {
                    $push : {
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
            message : "Classroom joined successffully",
        });
        
    } catch (error) {
        console.log(error);
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

        const updatedClassroom = await CLASSROOM.findByIdAndUpdate(
            id,
            {
                $pull : {
                    studentEnrolled : userID
                }
            },
            {new : true}
        );

        const updatedUser = await USER.findByIdAndUpdate(
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
        const {id} = req.params;
        const {userID} = req.body;
        const instructorID = req.user.id;

        const classroom = await CLASSROOM.findById(id);
        if(!classroom){
            return res.status(400).json({
                success : false,
                message : "Classrooom not found"
            });
        }

        if(classroom.instructor.toString() !== instructorID.toString()){
            return res.status(400).json({
                success : false,
                message : "You are not authorized to accept the equest"
            });
        }

        if(!classroom.pendingRequests.includes(userID)){
            return res.status(400).json({
                success: false,
                message : "User is not requested"
            });
        }

        const updatedClassroom = await CLASSROOM.findByIdAndUpdate(
            id,
            {
                $pull : {
                    pendingRequests : userID
                },
                $push : {
                    studentEnrolled : userID
                },
            },
            {new : true}
        );

        const updatedUser = await USER.findByIdAndUpdate(
            userID,
            {
                $push : {
                    classroom : id,
                }
            },
            {new : true}
        );

        return res.status(200).json({
            success : false,
            message : "User Request accespted successfullt"
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success : false,
            message : "Error in accepting request, Please try again later"
        });
    }
}

exports.declineRequest = async (req,res) => {
    try {
        const {id} = req.params;
        const {userID} = req.body;
        const instructorID = req.user.id;

        const classroom = await CLASSROOM.findById(id);
        if(!classroom){
            return res.status(400).json({
                success : false,
                message : "Classrooom not found"
            });
        }

        if(classroom.instructor.toString() !== instructorID.toString()){
            return res.status(400).json({
                success : false,
                message : "You are not authorized to accept the equest"
            });
        }

        if(!classroom.pendingRequests.includes(userID)){
            return res.status(400).json({
                success: false,
                message : "User is not requested"
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
            message : "Request declined successfully"
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success : false,
            message : "Error in declining request, Please try again later"
        });
    }
}

exports.removeStudent = async(req,res) => {
    try {
        const {id} = req.params;
        const instructorID = req.user.id;
        const {studentID} = req.body;

        const classroom = await CLASSROOM.findById(id);

        if(!classroom){
            return res.status(400).json({
                success : false,
                message : "Classroon cannot find "
            });
        }

        if(classroom.instructor.toString() !== instructorID.toString()){
            return res.status(400).json({
                success : false,
                message : "You is not authorized to perform this task"
            });
        }

        if(classroom.studentEnrolled.includes(studentID)){
            return res.status(400).json({
                success : false,
                message : "user is no longer member of classroom"
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

        const updatedUser = await USER.findByIdAndUpdate(
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
            message : "User removed successfully"
        });
        
    } catch (error) {
        console.log(first);
        return res.status(500).json({
            success : false,
            message : "error while removing student"
        });
    }
}
