const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const router = express.Router();

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

// Định nghĩa route POST để upload file
// Middleware upload sẽ xử lý file trước khi vào userController.uploadUsers
// Nếu có lỗi từ multer (vd: file quá lớn, sai loại file), nó sẽ tự động trả lỗi
router.post('/users/upload', (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Lỗi từ Multer (vd: file quá lớn)
            return res.status(400).json({ message: `Lỗi Multer: ${err.message}` });
        } else if (err) {
            // Lỗi khác từ fileFilter hoặc không xác định
            return res.status(400).json({ message: err.message || 'Lỗi không xác định khi upload file.' });
        }
        // Nếu không có lỗi, chuyển sang controller
        next();
    })
}, userController.uploadUsers);

// Thêm các route khác cho user nếu cần (ví dụ: lấy danh sách user, tạo từng user...)
// router.get('/users', userController.getUsers);
// router.post('/users', userController.createUser);

module.exports = router;