const express = require("express");

// import routers
const auth = require("./routes/auth.js");
const classroom = require("./routes/classroom.js");
const cookieParser = require("cookie-parser");

require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 4000;

const {dbConnect} = require("./config/database.js");
dbConnect();

// Pre-register all Mongoose models to allow population across collections
require("./model/user");
require("./model/setting");
require("./model/classroom");
require("./model/file");
require("./model/lesson");
require("./model/sublesson");
require("./model/quiz");
require("./model/otp");

const cors = require("cors");

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth",auth);
app.use("/api/v1/classroom",classroom);

app.listen(PORT,()=>{
    console.log(`Server Starting at Port ${PORT}`);  
});