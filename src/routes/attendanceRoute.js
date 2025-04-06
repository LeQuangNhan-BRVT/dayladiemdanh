// routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// @route   POST /api/attendance/generate-qr
// @desc    Generate QR code for a class
// @access  Private (Teacher only)
router.post('/generate-qr', protect, restrictTo('teacher'), attendanceController.generateQR);

// @route   POST /api/attendance/check-in
// @desc    Student checks in using QR code
// @access  Private (Student only)
router.post('/check-in', protect, restrictTo('student'), attendanceController.checkIn);

router.get('/my-history', protect, restrictTo('student'), attendanceController.getStudentHistory);
router.get('/history/:classId', protect, restrictTo('student'), attendanceController.getStudentClassHistory);

// Route cho giáo viên tùy chỉnh thời gian điểm danh
router.put('/schedule/attendance-time', 
    protect, 
    restrictTo('admin', 'teacher'), 
    attendanceController.updateAttendanceTime
);

module.exports = router;