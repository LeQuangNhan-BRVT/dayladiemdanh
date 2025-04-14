// routes/classRoutes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const classController = require('../controllers/classController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Áp dụng middleware bảo vệ và giới hạn quyền cho tất cả các route quản lý Class
// Chỉ Admin và Teacher mới được quản lý Class và Schedule
router.use(protect, restrictTo('admin', 'teacher'));
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // Chỉ chấp nhận file excel hoặc csv
        if (file.mimetype.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') || 
            file.mimetype.startsWith('application/vnd.ms-excel') || 
            file.mimetype === 'text/csv') // Giữ lại CSV nếu controller hỗ trợ
        { 
            cb(null, true);
        } else {
            cb(new Error('Loại file không được hỗ trợ. Chỉ chấp nhận file Excel hoặc CSV.'), false);
        }
    }
}).single('studentsFile'); // Tên field trong form-data cho file danh sách sinh viên
// --- Routes cho Class ---
router.post('/', classController.createClass);
router.get('/', classController.getAllClasses);
// Route lấy lớp học của giáo viên - đặt trước /:id để tránh xung đột
router.get('/teacher', restrictTo('teacher'), classController.getTeacherClasses);
router.get('/:id', classController.getClassById);
// router.put('/:id', classController.updateClass); // Thêm nếu cần
// router.delete('/:id', classController.deleteClass); // Thêm nếu cần
router.post(
    '/:classId/students/upload',
    protect,
    restrictTo('admin', 'teacher'),
    (req, res, next) => {
        upload(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ message: `Lỗi Multer: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ message: err.message || 'Lỗi không xác định khi upload file.' });
            }
            // Nếu không lỗi, chuyển sang controller
            next();
        })
    },
    classController.bulkAddStudentsToClass
);
// --- Routes quản lý Student trong Class ---
// Lấy danh sách sinh viên của lớp :classId
router.get('/:classId/students', classController.getClassStudents); 
// Thêm sinh viên :studentId vào lớp :classId
router.post('/:classId/students/:studentId', classController.addStudentToClass); 
// Xóa sinh viên :studentId khỏi lớp :classId
router.delete('/:classId/students/:studentId', classController.removeStudentFromClass);


// --- Routes cho Schedule ---
// Tạo lịch học mới cho lớp :classId
router.post('/:classId/schedules', classController.createSchedule);
// Lấy tất cả lịch học của lớp :classId
router.get('/:classId/schedules', classController.getClassSchedules);
// Cập nhật lịch học :scheduleId của lớp :classId
router.put('/:classId/schedules/:scheduleId', classController.updateSchedule);
// Xóa lịch học :scheduleId của lớp :classId
router.delete('/:classId/schedules/:scheduleId', classController.deleteSchedule);



module.exports = router;