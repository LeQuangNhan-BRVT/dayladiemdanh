// middleware/authMiddleware.js
'use strict'; // Bật strict mode cho code tốt hơn

const jwt = require('jsonwebtoken');
const db = require('../models'); // Đảm bảo đường dẫn này trỏ đúng đến thư mục models của bạn
const User = db.User; // Lấy model User từ db object

/**
 * Middleware để xác thực JWT token và gắn thông tin user vào request.
 * Cần được sử dụng trước các route yêu cầu đăng nhập.
 */
exports.protect = async (req, res, next) => {
    let token;

    // 1. Lấy token từ header 'Authorization'
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Tách lấy phần token (sau 'Bearer ')
            token = req.headers.authorization.split(' ')[1];

            // 2. Xác thực token bằng secret key
            // jwt.verify sẽ throw error nếu token không hợp lệ hoặc hết hạn
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Tìm user trong database dựa vào ID trong token đã giải mã
            // Chỉ lấy các trường cần thiết, không lấy password hash
            const currentUser = await User.findByPk(decoded.id, {
                attributes: ['id', 'username', 'role', 'email', 'studentId', /* Thêm các trường khác nếu cần */]
            });

            // 4. Kiểm tra xem user có tồn tại không (tránh trường hợp token hợp lệ nhưng user đã bị xóa)
            if (!currentUser) {
                return res.status(401).json({ status: 'fail', error: 'The user belonging to this token does no longer exist.' });
            }

            // (Tùy chọn) Kiểm tra xem user có thay đổi mật khẩu sau khi token được cấp không
            // if (currentUser.changedPasswordAfter(decoded.iat)) { // Giả sử có hàm này trong model User
            //     return res.status(401).json({ status: 'fail', error: 'User recently changed password! Please log in again.' });
            // }

            // 5. Gắn thông tin user vào đối tượng request để các middleware/controller sau sử dụng
            req.user = currentUser;
            // console.log('Authenticated User:', req.user.toJSON()); // Debugging: Xem thông tin user đã xác thực
            next(); // Cho phép request đi tiếp

        } catch (error) {
            // Xử lý các lỗi xác thực token
            console.error('JWT Authentication Error:', error.name, '-', error.message);
            if (error.name === 'JsonWebTokenError') {
                // Token không hợp lệ (sai chữ ký, sai định dạng,...)
                return res.status(401).json({ status: 'fail', error: 'Invalid token. Please log in again.' });
            } else if (error.name === 'TokenExpiredError') {
                // Token đã hết hạn
                return res.status(401).json({ status: 'fail', error: 'Your token has expired! Please log in again.' });
            } else {
                 // Lỗi khác trong quá trình verify hoặc tìm user
                return res.status(401).json({ status: 'fail', error: 'Not authorized. Please log in.' });
            }
        }
    }

    // Nếu không tìm thấy token trong header Authorization
    if (!token) {
        return res.status(401).json({ status: 'fail', error: 'You are not logged in! Please log in to get access.' });
    }
};

/**
 * Middleware Factory để giới hạn quyền truy cập route cho các vai trò (role) cụ thể.
 * @param {...string} roles - Danh sách các vai trò được phép truy cập (ví dụ: 'admin', 'teacher').
 * @returns {function} - Middleware function để kiểm tra vai trò.
 */
exports.restrictTo = (...roles) => {
    // Trả về một middleware function
    return (req, res, next) => {
        // Middleware này phải chạy SAU middleware 'protect'
        // Giả định rằng req.user đã được gắn bởi 'protect'

        // Kiểm tra xem req.user và req.user.role có tồn tại không
        if (!req.user || !req.user.role) {
             // Lỗi này không nên xảy ra nếu protect chạy đúng, nhưng kiểm tra cho chắc chắn
             console.error('Error in restrictTo: req.user or req.user.role is missing.');
             return res.status(500).json({ error: 'Authentication context is missing.' });
        }

        // Kiểm tra xem vai trò của người dùng có nằm trong danh sách các vai trò được phép không
        if (!roles.includes(req.user.role)) {
            // Nếu không có quyền -> 403 Forbidden
            return res.status(403).json({
                status: 'fail',
                error: 'You do not have permission to perform this action'
            });
        }

        // Nếu có quyền, cho phép request đi tiếp
        next();
    };
};