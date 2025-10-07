const SUBLESSON = require("../model/sublesson");

exports.createSublesson = async (req,res) => {
    try {
        
    } catch (error) {
        return res.status(500).json({
            success : false,
            message : "error in creating subsection",
            message : error.message
        })
    }
}