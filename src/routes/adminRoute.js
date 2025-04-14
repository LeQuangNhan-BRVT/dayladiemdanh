// routes/adminRoutes.js
const express = require("express");
const multer = require('multer');
const userController = require('../controllers/userController');
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// @route   POST /api/admin/users
// @desc    Create a new user (student, teacher, or admin)
// @access  Private (Admin only)
router.post(
  "/users",
  protect,
  restrictTo("admin"),
  adminController.createUser
);

// @route   GET /api/admin/teachers
// @desc    Get all teachers
// @access  Private (Admin only)
router.get(
  "/teachers",
  protect,
  restrictTo("admin"),
  adminController.getTeachers
);
// Cấu hình Multer
// Sử dụng memoryStorage để lưu file tạm thời trong bộ nhớ RAM
// Giới hạn kích thước file (ví dụ: 5MB)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // Kiểm tra loại file ở đây hoặc trong controller
        // Ví dụ đơn giản: chỉ chấp nhận excel
        if (file.mimetype.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') || file.mimetype.startsWith('application/vnd.ms-excel')) {
            cb(null, true);
        } else {
             // Nếu muốn hỗ trợ cả CSV: || file.mimetype === 'text/csv'
            cb(new Error('Loại file không được hỗ trợ. Chỉ chấp nhận file Excel.'), false);
        }
    }
}).single('usersFile'); // Tên field trong form-data dùng để upload file

// Định nghĩa route POST để upload file users cho admin
// Middleware upload sẽ xử lý file trước khi vào adminController.uploadUsers
router.post(
    '/users/upload', 
    protect,                // Middleware xác thực
    restrictTo('admin'),     // Middleware phân quyền Admin
    (req, res, next) => {    // Middleware xử lý upload
        upload(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ message: `Lỗi Multer: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ message: err.message || 'Lỗi không xác định khi upload file.' });
            }
            next();
        })
    }, 
    adminController.uploadUsers // Sửa lại thành adminController.uploadUsers
);

// @route   PUT /api/admin/teachers/:id
// @desc    Update a teacher
// @access  Private (Admin only)
// @route   DELETE /api/admin/teachers/:id
// @desc    Delete a teacher
// @access  Private (Admin only)
router.route("/teachers/:id")
    .put(protect, restrictTo("admin"), adminController.updateTeacher)
    .delete(protect, restrictTo("admin"), adminController.deleteTeacher);

module.exports = router;
