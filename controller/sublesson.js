const SUBLESSON = require("../model/sublesson");

exports.createSublesson = async (req, res) => {
    try {
        const { name, fileUrl } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Sublesson name is required"
            });
        }
        const sublesson = await SUBLESSON.create({ name, fileUrl });
        return res.status(200).json({
            success: true,
            message: "Sublesson created successfully",
            sublesson
        });
    } catch (error) {
        console.error("Sublesson creation error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Error in creating sublesson"
        });
    }
};