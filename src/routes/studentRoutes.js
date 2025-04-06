// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Áp dụng middleware bảo vệ cho tất cả các route
router.use(protect);

// @route   GET /api/students/search
// @desc    Search for students by name or studentId
// @access  Private (Admin, Teacher - vì dùng để thêm sv vào lớp)
router.get('/search', restrictTo('admin', 'teacher'), studentController.searchStudents);

// @route   GET /api/students
// @desc    Get all students
// @access  Private (Admin, Teacher)
router.get('/', restrictTo('admin', 'teacher'), studentController.getAllStudents);

// @route   GET /api/students/:username
// @desc    Get a single student by username
// @access  Private (Admin, Teacher, Student - controller sẽ kiểm tra chi tiết hơn)
router.get('/:username', studentController.getStudentByUsername);

// @route   PUT /api/students/:username/profile
// @desc    Update student profile (password and email)
// @access  Private (Admin, Teacher, Student - controller sẽ kiểm tra chi tiết hơn)
router.put('/:username/profile', studentController.updateStudentProfile);

// Không nên có route POST /api/students ở đây

module.exports = router;