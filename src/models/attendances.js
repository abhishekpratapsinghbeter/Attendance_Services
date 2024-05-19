const mongoose = require('mongoose');
/*
const attendanceSchema = new mongoose.Schema({
    batch:{
        type:String,
        required:true
    },
    years:[{
        course:{
          type:String,
          required:true
        },
        department:[{
            branch:{
                type:String,
                required:true
            },
            classes:[{
                section:{
                    type:String,
                    required:true,
                },
                subject:[{
                    subject_name: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref:'Subject',
                        required: true
                    },
                    subject_code: {
                        type: String,
                        required: true
                    },
                    class_id: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref:'Class',
                        required: true
                    },
                    subject_teacher: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref:'Teacher',
                        required: true
                    },
                    students: [{
                        student_id: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref:'Student',
                            required: true,
                            unique:true,
                        },
                        student_name: {
                            type: String,
                            required: true
                        },
                        attendance: [{
                            teacher:{
                                type:mongoose.Schema.Types.ObjectId,
                                required:true,
                            },
                            date: {
                                type: Date,
                                default: Date.now  
                            },
                            status: {
                                type: String,
                                enum: ['present', 'absent'],
                                required: true
                            }
                        }]
                    }]
                }],
            }]
        }],
    }],
   
    
    
    
    
    
});
*/

const attendanceSchema = new mongoose.Schema({
    batch: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    branch: {
        type: String,
        required: true
    },
    classes: [{
        class_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Class',
            required: true
        },
        section: {
            type: String,
            required: true
        },
        subjects: [{
            subject_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Subject',
                required: true
            },
            subject_code: {
                type: String,
                required: true
            },
            subject_teacher: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Teacher',
                required: true
            },
            students: [{
                student_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Student',
                    required: true
                },
                student_name: {
                    type: String,
                    required: true
                },
                attendance: [{
                    teacher: {
                        type: mongoose.Schema.Types.ObjectId,
                        required: true,
                    },
                    date: {
                        type: Date,
                        default: Date.now
                    },
                    status: {
                        type: String,
                        enum: ['present', 'absent'],
                        required: true
                    }
                }]
            }]
        }]
    }]
});


const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
