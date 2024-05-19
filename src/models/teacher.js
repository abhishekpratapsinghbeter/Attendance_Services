const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    teacher_id: {
        type: String,
        required: true,
        unique: true
    },
    role:{
        type:String,
        required:true,
    },
    teacher_name: {
        type: String,
        required: true
    },
    teacher_number: {
        type: String,
        required: true
    },
    teacher_gender: {
        type: String,   
        required: true
    },
    teacher_photo: {
        type: String 
    },
    teacher_mail:{
        type:String
    },
});

const Teacher = mongoose.model("Teacher", teacherSchema);
module.exports = Teacher;
