const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    student_cllgid: {
        type: String,
        required: true,
        unique:true
    },
    student_regId: {
        type: String,
        required: true
    },
    student_name: {
        type: String,
        required: true
    },
    student_branch: {
        type: String,
        required: true
    },
    student_section: {
        type: String,
        required: true
    },
    student_batch: {
        type: Number,
        required: true
    },
    student_rollno: {
        type: String,
        required: true,
        unique: true
    },
    student_number: {
        type: String,
        required: true
    },
    student_gender: {
        type: String,
        required: true
    },
    student_photo: {
        type: String // Assuming storing photo URL
    },
    student_course: {
        type: String,
        required: true
    },
    semester:{
        type:String,
        required:true
    },
    student_mail:{
        type:String,
        
    },
    role:{
        type:String,
        required:true
    }
});

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
