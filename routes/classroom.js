// const express = require("express");
// const router = express.Router();

// const {createClassroom} = require("../controller/classroom");
// const {deleteClassroom} = require("../controller/classroom");
// const {findClassroomByClassCode} = require("../controller/classroom");
// const {joinClassroom} = require("../controller/classroom");
// const {leaveClassroom} = require("../controller/classroom");
// const {acceptRequest} = require("../controller/classroom");
// const {declineRequest} = require("../controller/classroom");
// const {removeStudent} = require("../controller/classroom");


// const {auth} = require("../middleware/authMiddleware");

// router.post("/createClassroom", auth, createClassroom);
// router.put("/updateClassroom", auth, updateClassroom);
// router.delete("/deleteClassroom/:id", auth, deleteClassroom);
// router.post("/joinClassroom", auth, joinClassroom);
// router.post("/leaveClassroom", auth, leaveClassroom);
// router.post("/acceptRequest", auth, acceptRequest);
// router.post("/declineRequest", auth, declineRequest);
// router.post("/removeStudent", auth, removeStudent);

// module.exports = router;

const express = require("express");
const router = express.Router();

const {
  createClassroom,
  deleteClassroom,
  findClassroomByClassCode,
  joinClassroom,
  leaveClassroom,
  acceptRequest,
  declineRequest,
  removeStudent,
  updateClassroom
} = require("../controller/classroom");

const { auth } = require("../middleware/authMiddleware");

// Public route (no auth)
router.get("/findClassroomByClassCode", findClassroomByClassCode);

// Apply auth middleware to all routes below this line
router.use(auth);

// Now all routes below require authentication
router.post("/createClassroom", createClassroom);
router.put("/updateClassroom/:id", updateClassroom);
router.delete("/deleteClassroom/:id", deleteClassroom);
router.post("/joinClassroom", joinClassroom);
router.delete("/leaveClassroom/:id", leaveClassroom);
router.post("/acceptRequest", acceptRequest);
router.post("/declineRequest", declineRequest);
router.post("/removeStudent", removeStudent);

module.exports = router;
