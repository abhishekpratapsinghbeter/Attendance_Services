const express = require('express');
const mongoose = require('mongoose')
const router = express.Router();
const Attendance = require("../models/attendances");
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Subject = require('../models/subject');
const Class = require('../models/class');
const  axios = require('axios');
const authMiddleware = require('../middleware/authmiddleware');







/**********************************************************************************************************************************************************************************
 *  Qr link generation
*********************************************************************************************************************************************************************************** */

router.post('/takeAttendance', authMiddleware(['Admin','Teacher']), async (req, res) => {
    try {
        const {userID, course, section, batch, branch, subjectCode } = req.body;
        
        
        const requestData = { section,course, batch, branch, subjectCode, userID };
       
        const token = req.headers.authorization;

        const qrCodeServiceResponse = await axios.post('https://logging-services.onrender.com/generateQRCode', requestData, {
            headers: {
                Authorization: token
            }
        });

        if (qrCodeServiceResponse.status !== 200) {
            throw new Error('Failed to generate QR code');
        }
        await axios.post('https://logging-services.onrender.com/log', { level: 'info', message: `User ${userID} created Qrcode for section${section} ` });
        const qrCodeImageData = qrCodeServiceResponse.data.qrCodeImage;
        res.send({ qrCodeImage: qrCodeImageData });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).send('Internal Server Error');
    }
});












/**********************************************************************************************************************************************************************************
 *  Marking Attendances
*********************************************************************************************************************************************************************************** */

router.post('/markattendance', authMiddleware(['Student']), async (req, res) => {
    const { section, batch, course, branch, userID, subjectCode, studentID } = req.body;
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const classDetails = await Class.findOne({
            class_section: section,
            class_batch: batch,
            class_branch: branch,
            class_course: course
        }).session(session);

        if (!classDetails) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Class details not found' });
        }

        const subject = await Subject.findOne({ subject_code: subjectCode }).session(session);
        if (!subject) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Subject details not found' });
        }

        const teacher = await Teacher.findOne({ teacher_id: userID }).session(session);
        if (!teacher) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Teacher details not found' });
        }

        let attendance = await Attendance.findOne({
            batch: batch,
            course: course,
            branch: branch,
            'classes.class_id': classDetails._id
        }).session(session);

        if (!attendance) {
            const students = await Student.find({
                student_section: section,
                student_batch: batch,
                student_branch: branch,
                student_course: course
            }).session(session);

            const studentRecords = students.map(student => ({
                student_id: student._id,
                student_name: student.student_name,
                attendance: [{
                    teacher: teacher._id,
                    date: new Date(),
                    status: 'absent' 
                }]
            }));

            attendance = new Attendance({
                batch: batch,
                course: course,
                branch: branch,
                classes: [{
                    class_id: classDetails._id,
                    section: section,
                    subjects: [{
                        subject_id: subject._id,
                        subject_code: subjectCode,
                        subject_teacher: teacher._id,
                        students: studentRecords
                    }]
                }]
            });
        } else {
            const classIndex = attendance.classes.findIndex(cls => cls.class_id.equals(classDetails._id));
            if (classIndex !== -1) {
                const subjectIndex = attendance.classes[classIndex].subjects.findIndex(sub => sub.subject_id.equals(subject._id));
                if (subjectIndex !== -1) {
                    attendance.classes[classIndex].subjects[subjectIndex].students.forEach(student => {
                        const attendanceRecord = student.attendance.find(att => new Date(att.date).toDateString() === new Date().toDateString());
                        if (!attendanceRecord) {
                            student.attendance.push({
                                teacher: teacher._id,
                                date: new Date(),
                                status: 'absent' 
                            });
                        }
                    });
                }
            }
        }

        const student = await Student.findOne({ student_cllgid: studentID }).session(session);
        if (!student) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: `Student with ID ${studentID} not found` });
        }

        const classIndex = attendance.classes.findIndex(cls => cls.class_id.equals(classDetails._id));
        if (classIndex === -1) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Class details not found in attendance document' });
        }

        let subjectIndex = attendance.classes[classIndex].subjects.findIndex(sub => sub.subject_id.equals(subject._id));
        if (subjectIndex === -1) {
            const students = await Student.find({
                student_section: section,
                student_batch: batch,
                student_branch: branch,
                student_course: course
            }).session(session);

            const studentRecords = students.map(student => ({
                student_id: student._id,
                student_name: student.student_name,
                attendance: [{
                    teacher: teacher._id,
                    date: new Date(),
                    status: 'absent' 
                }]
            }));

            attendance.classes[classIndex].subjects.push({
                subject_id: subject._id,
                subject_code: subjectCode,
                subject_teacher: teacher._id,
                students: studentRecords
            });

            subjectIndex = attendance.classes[classIndex].subjects.length - 1;
        }

        let studentAttendance = attendance.classes[classIndex].subjects[subjectIndex].students.find(std => std.student_id.equals(student._id));
        if (!studentAttendance) {
            studentAttendance = {
                student_id: student._id,
                student_name: student.student_name,
                attendance: []
            };
            attendance.classes[classIndex].subjects[subjectIndex].students.push(studentAttendance);
        }

        const attendanceRecord = {
            teacher: teacher._id,
            date: new Date(),
            status: 'present'
        };

        studentAttendance.attendance.push(attendanceRecord);

        await attendance.save({ session });

        await session.commitTransaction();
        session.endSession();

        await axios.post('https://logging-services.onrender.com/log', { level: 'info', message: `Student ${userID} marked his attendance for Subject ${subjectCode}` });
        res.status(200).json({ message: 'Attendance marked successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.post('/markattendance1', authMiddleware(['Teacher', 'Admin']), async (req, res) => {
    const { section, batch, course, branch, userID, subjectCode, studentIDs } = req.body;

    if (!Array.isArray(studentIDs)) {
        return res.status(400).json({ error: 'studentIDs should be an array' });
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const classDetails = await Class.findOne({
            class_section: section,
            class_batch: batch,
            class_branch: branch,
            class_course: course
        });

        if (!classDetails) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Class details not found' });
        }

        const subject = await Subject.findOne({ subject_code: subjectCode });
        if (!subject) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Subject details not found' });
        }

        const teacher = await Teacher.findOne({ teacher_id: userID });
        if (!teacher) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Teacher details not found' });
        }

        let attendance = await Attendance.findOne({
            batch: batch,
            'classes.class_id': classDetails._id,
            'classes.subjects.subject_id': subject._id
        });

        if (!attendance) {
            const students = await Student.find({
                student_section: section,
                student_batch: batch,
                student_branch: branch,
                student_course: course
            });

            const studentRecords = students.map(student => ({
                student_id: student._id,
                student_name: student.student_name,
                attendance: [{
                    teacher: teacher._id,
                    date: new Date(),
                    status: 'absent' 
                }]
            }));

            attendance = new Attendance({
                batch: batch,
                course: course,
                branch: branch,
                classes: [{
                    class_id: classDetails._id,
                    section: section,
                    subjects: [{
                        subject_id: subject._id,
                        subject_code: subjectCode,
                        subject_teacher: teacher._id,
                        students: studentRecords
                    }]
                }]
            });
        }

        for (const studentID of studentIDs) {
            const student = await Student.findOne({ student_cllgid: studentID });
            if (!student) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ error: `Student with ID ${studentID} not found` });
            }

            const classIndex = attendance.classes.findIndex(cls => cls.class_id.equals(classDetails._id));
            if (classIndex === -1) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ error: 'Class details not found in attendance document' });
            }

            const subjectIndex = attendance.classes[classIndex].subjects.findIndex(sub => sub.subject_id.equals(subject._id));
            if (subjectIndex === -1) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ error: 'Subject details not found in attendance document' });
            }

            let studentAttendance = attendance.classes[classIndex].subjects[subjectIndex].students.find(std => std.student_id.equals(student._id));
            if (!studentAttendance) {
                studentAttendance = {
                    student_id: student._id,
                    student_name: student.student_name,
                    attendance: []
                };
                attendance.classes[classIndex].subjects[subjectIndex].students.push(studentAttendance);
            }

            const attendanceRecord = {
                teacher: teacher._id,
                date: new Date(),
                status: 'present'
            };
            studentAttendance.attendance.push(attendanceRecord);
        }

        attendance.classes.forEach(cls => {
            if (cls.class_id.equals(classDetails._id)) {
                cls.subjects.forEach(sub => {
                    if (sub.subject_id.equals(subject._id)) {
                        sub.students.forEach(stu => {
                            const today = new Date().toDateString();
                            const studentHasAttendanceToday = stu.attendance.some(att => new Date(att.date).toDateString() === today);
                            if (!studentHasAttendanceToday) {
                                stu.attendance.push({
                                    teacher: teacher._id,
                                    date: new Date(),
                                    status: 'absent'
                                });
                            }
                        });
                    }
                });
            }
        });
        await attendance.save({ session });
        await session.commitTransaction();
        session.endSession();

        await axios.post('https://logging-services.onrender.com/log', { level: 'info', message: `Teacher ${userID} marked the attendances for Subject ${subjectCode} of students ${studentIDs}` });
        res.status(200).json({ message: 'Attendance marked successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});























/**********************************************************************************************************************************************************************************
 *  Get the attendances of specific subject
*********************************************************************************************************************************************************************************** */


router.get('/attendance/subject/:subjectCode', authMiddleware(['Admin','Teacher']), async (req, res) => {
    const { subjectCode } = req.params;
    try {
        const attendance = await Attendance.aggregate([
        
            { $unwind: "$classes" },
            { $unwind: "$classes.subjects" },
            { $match: { "classes.subjects.subject_code": subjectCode } }
        ]);

        if (!attendance || attendance.length === 0) {
            return res.status(404).send({ message: `Attendance records for subject ${subjectCode} not found` });
        }

        res.send(attendance);
    } catch (err) {
        console.error('Error fetching attendance:', err);
        res.status(500).send({ message: 'Internal server error' });
    }
});








/**********************************************************************************************************************************************************************************
 *  Get the attendances of the specific student
*********************************************************************************************************************************************************************************** */

router.get('/attendance/stats/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const student = await Student.findOne({ student_cllgid: studentId });
        
    if (!student) {
        return res.status(404).send({ message: `Student with ID ${studentId} not found` });
    }
    try {
        const student = await Student.findOne({ student_cllgid: studentId });
    
        if (!student) {
            return res.status(404).send({ message: `Student with ID ${studentId} not found` });
        }
    
        const attendance = await Attendance.aggregate([
            { $unwind: "$classes" },
            { $unwind: "$classes.subjects" },
            { $unwind: "$classes.subjects.students" },
            { $match: { "classes.subjects.students.student_id": student._id } },
            {
                $lookup: {
                    from: "subjects",
                    localField: "classes.subjects.subject_id",
                    foreignField: "_id",
                    as: "subject"
                }
            },
            {
                $project: {
                    subjectId: "$classes.subjects.subject_id",
                    subjectName: { $arrayElemAt: ["$subject.subject_name", 0] },
                    attendance: "$classes.subjects.students.attendance"
                }
            },
            {
                $group: {
                    _id: {
                        subjectId: "$subjectId",
                        subjectName: "$subjectName"
                    },
                    totalCount: { $sum: { $size: "$attendance" } },
                    totalClassesPresent: {
                        $sum: {
                            $size: {
                                $filter: {
                                    input: "$attendance",
                                    as: "attend",
                                    cond: { $eq: ["$$attend.status", "present"] }
                                }
                            }
                        }
                    },
                    attendance: { $push: "$attendance" }
                }
            }
        ]);
    
        if (!attendance || attendance.length === 0) {
            return res.status(404).send({ message: `Attendance records for student ${studentId} not found` });
        }
    
        const totalClasses = attendance.reduce((total, entry) => total + entry.totalCount, 0);
        const totalPresents = attendance.reduce((total, entry) => total + entry.totalClassesPresent, 0);
    
        res.send({ totalClasses, totalPresents, attendance });
    } catch (err) {
        console.error('Error fetching attendance:', err);
        res.status(500).send({ message: 'Internal server error' });
    }
});

router.get('/attendance/student/:studentId', async (req, res) => {
    const { studentId } = req.params;
        try {
            const student = await Student.findOne({ student_cllgid: studentId });
        
            if (!student) {
                return res.status(404).send({ message: `Student with ID ${studentId} not found` });
            }
        
            const attendance = await Attendance.aggregate([
                { $unwind: "$classes" },
                { $unwind: "$classes.subjects" },
                { $unwind: "$classes.subjects.students" },
                { $match: { "classes.subjects.students.student_id": student._id } },
                {
                    $lookup: {
                        from: "subjects",
                        localField: "classes.subjects.subject_id",
                        foreignField: "_id",
                        as: "subject"
                    }
                },
                {
                    $project: {
                        subjectId: "$classes.subjects.subject_id",
                        subjectName: { $arrayElemAt: ["$subject.subject_name", 0] },
                        attendance: "$classes.subjects.students.attendance"
                    }
                },
                {
                    $group: {
                        _id: {
                            subjectId: "$subjectId",
                            subjectName: "$subjectName"
                        },
                        totalCount: { $sum: { $size: "$attendance" } },
                        totalClassesPresent: {
                            $sum: {
                                $size: {
                                    $filter: {
                                        input: "$attendance",
                                        as: "attend",
                                        cond: { $eq: ["$$attend.status", "present"] }
                                    }
                                }
                            }
                        },
                        attendance: { $push: "$attendance" }
                    }
                }
            ]);
        
            if (!attendance || attendance.length === 0) {
                return res.status(404).send({ message: `Attendance records for student ${studentId} not found` });
            }
            res.send(attendance);
        } catch (err) {
            console.error('Error fetching attendance:', err);
            res.status(500).send({ message: 'Internal server error' });
        }
});










/**********************************************************************************************************************************************************************************
 *  Get the attendances of the specific class
*********************************************************************************************************************************************************************************** */

router.get('/api/attendance/class/:classId', authMiddleware(['Admin','Teacher']), async (req, res) => {
    const { classId } = req.params;
    try {
        const attendance = await Attendance.aggregate([
            { $unwind: "$classes" },
            { $match: { "classes.class_id": mongoose.Types.ObjectId(classId) } }
        ]);

        if (!attendance || attendance.length === 0) {
            return res.status(404).send({ message: `Attendance records for class ${classId} not found` });
        }

        res.send(attendance);
    } catch (err) {
        console.error('Error fetching attendance:', err);
        res.status(500).send({ message: 'Internal server error' });
    }
});










/**********************************************************************************************************************************************************************************
 *  Get the attendances of the specific student for the specific subject
*********************************************************************************************************************************************************************************** */



router.get('/api/attendance/student/:studentId/subject/:subjectCode', authMiddleware(['Admin','Teacher','Student']), async (req, res) => {
    const { studentId, subjectCode } = req.params;
  
    try {
      const student = await Student.findOne({ student_cllgid: studentId });
  
      if (!student) {
        return res.status(404).send({ message: `Student with ID ${studentId} not found` });
      }
  
      const attendance = await Attendance.aggregate([
        {
          $unwind: '$classes' 
        },
        {
          $unwind: '$classes.subjects'
        },
        {
          $match: { // Match documents where:
            'classes.subjects.subject_id': new mongoose.Types.ObjectId(subjectCode), 
            'classes.subjects.students.student_id': student._id 
          }
        },
        {
          $lookup: { 
            from: 'subjects',
            localField: 'classes.subjects.subject_id',
            foreignField: '_id',
            as: 'subject'
          }
        },
        {
          $project: { 
            _id: 0, 
            subjectName: { $arrayElemAt: ['$subject.subject_name', 0] }, 
            attendance: { 
              $filter: {
                input: '$classes.subjects.students',
                as: 'studentData',
                cond: { $eq: ['$$studentData.student_id', student._id] }
              }
            }
          }
        }
      ]);
  
  
      if (!attendance || attendance.length === 0) {
        return res.status(404).send({ message: `Attendance records for student ${studentId} and subject ${subjectCode} not found` });
      }
  
      res.send(attendance);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      res.status(500).send({ message: 'Internal server error' });
    }
  });
  












/**********************************************************************************************************************************************************************************
 *  Update the attendance of the students on the specific date for the specific subject
*********************************************************************************************************************************************************************************** */

router.put('/api/attendance/update', authMiddleware(['Admin','Teacher']), async (req, res) => {
    const attendanceUpdates = req.body;

    try {
        await Promise.all(attendanceUpdates.map(async update => {
            const { studentId, date, status, subjectCode } = update;

            await Attendance.updateOne(
                { 
                    'classes.subjects.subject_code': subjectCode,
                    'classes.subjects.students.student_id': studentId,
                    'classes.subjects.students.attendance.date': date 
                },
                { 
                    $set: { 
                        'classes.$[classElem].subjects.$[subjectElem].students.$[studentElem].attendance.$[elem].status': status 
                    } 
                },
                { 
                    arrayFilters: [
                        { 'classElem.section': { $exists: true } },
                        { 'subjectElem.subject_code': subjectCode },
                        { 'studentElem.student_id': studentId },
                        { 'elem.date': date }
                    ] 
                }
            );
        }));
        res.send({ message: 'Attendance records updated successfully' });
    } catch (err) {
        console.error('Error updating attendance:', err);
        res.status(500).send({ message: 'Internal server error' });
    }
});









/**********************************************************************************************************************************************************************************
 *  Delete the attendance of specific class of the specific date
*********************************************************************************************************************************************************************************** */

router.delete('/api/attendance/:classId/date/:date', authMiddleware(['Admin','Teacher']), async (req, res) => {
    const { classId, date } = req.params;
    try {
        const result = await Attendance.updateMany(
            { 'classes.class_id': mongoose.Types.ObjectId(classId) },
            { $pull: { 'classes.$[].subjects.$[].students.$[].attendance': { date: new Date(date) } } }
        );

        res.send({ message: 'Attendance records deleted successfully' });
    } catch (err) {
        console.error('Error deleting attendance:', err);
        res.status(500).send({ message: 'Internal server error' });
    }
});









/**********************************************************************************************************************************************************************************
 *  Delete the attendance of specific Subject on the specific date for the specific class
*********************************************************************************************************************************************************************************** */

router.delete('/api/attendance/:classId/:subjectCode/date/:date', authMiddleware(['Admin','Teacher']), async (req, res) => {
    const { classId, subjectCode, date } = req.params;
    try {
        const result = await Attendance.updateMany(
            { 
                'classes.class_id': mongoose.Types.ObjectId(classId),
                'classes.subjects.subject_code': subjectCode,
                'classes.subjects.students.attendance.date': new Date(date)
            },
            { $pull: { 'classes.$[].subjects.$[].students.$[].attendance': { date: new Date(date) } } }
        );

        res.send({ message: 'Attendance records deleted successfully' });
    } catch (err) {
        console.error('Error deleting attendance:', err);
        res.status(500).send({ message: 'Internal server error' });
    }
});









/**********************************************************************************************************************************************************************************
 *  Delete the attendance of specific Subject of the specific class
*********************************************************************************************************************************************************************************** */

router.delete('/api/attendance/:classId/:subjectCode', authMiddleware(['Admin','Teacher']), async (req, res) => {
    const { classId, subjectCode } = req.params;
    try {
        const result = await Attendance.updateMany(
            { 
                'classes.class_id': mongoose.Types.ObjectId(classId),
                'classes.subjects.subject_code': subjectCode 
            },
            { $unset: { 'classes.$[].subjects.$[subjectElem].students.$[].attendance': '' } },
            { arrayFilters: [{ 'subjectElem.subject_code': subjectCode }] }
        );

        res.send({ message: 'Attendance records deleted successfully' });
    } catch (err) {
        console.error('Error deleting attendance:', err);
        res.status(500).send({ message: 'Internal server error' });
    }
});




module.exports = router;
