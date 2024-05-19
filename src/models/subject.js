const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    subject_code: {
        type: String,
        required: true,
        unique: true
    },
    subject_name: {
        type: String,
        required: true
    },
    subject_semester: {
        type: Number,
        required: true
    },
    subject_department: {
        type: String,
        required: true
    }
});

const Subject = mongoose.model("Subject", subjectSchema);
module.exports = Subject;
