const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    class_batch: {
        type: String,
        required: true
    },
    class_course: {
        type: String,
        required: true
    },
    class_section: {
        type: String,
        required: true
    },
    class_branch: {
        type: String,
        required: true
    },
    class_facilitator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    subject:[{
        subject_name:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Subject",
            required:true
        },
        subject_teacher:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Teacher",
            required:true
        }
    }]
});

const Class = mongoose.model("Class", classSchema);
module.exports = Class;
