// controllers/studentController.js
const db = require('../models');
const Student = db.Student;
const User = db.User;
const bcrypt = require('bcrypt');
const { Op } = require("sequelize"); // Thêm Op để tìm kiếm

// Hàm này không nên được sử dụng trực tiếp, việc tạo Student được xử lý bởi Admin
exports.createStudent = async (req, res) => {
    res.status(501).json({ error: 'Not Implemented. Students should be created by an administrator.' });
};

// Lấy danh sách tất cả sinh viên (Admin hoặc Teacher)
exports.getAllStudents = async (req, res) => {
    try {
        // Lấy thông tin cơ bản, có thể thêm phân trang nếu cần
        const students = await Student.findAll({
            attributes: ['id', 'name', 'studentId', 'email', 'createdAt'], // Chọn các trường cần thiết
            order: [['name', 'ASC']] // Sắp xếp theo tên
        });
        res.json(students);
    } catch (err) {
        console.error("Get all students error:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Lấy thông tin chi tiết một sinh viên
exports.getStudentByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        
        // Kiểm tra quyền truy cập
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.username !== username) {
            return res.status(403).json({ error: 'Bạn không có quyền xem thông tin này' });
        }

        // Tìm thông tin user
        const user = await db.User.findOne({
            where: { 
                username,
                role: 'student'
            },
            attributes: ['id', 'username', 'email', 'studentId']
        });

        if (!user) {
            return res.status(404).json({ error: 'Không tìm thấy sinh viên' });
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            studentId: user.studentId
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin sinh viên:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy thông tin sinh viên' });
    }
};

// Cập nhật thông tin sinh viên
exports.updateStudentProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const { currentPassword, newPassword, email } = req.body;

        // Kiểm tra quyền truy cập
        if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.user.username !== username) {
            return res.status(403).json({ error: 'Bạn không có quyền cập nhật thông tin này' });
        }

        // Tìm user
        const user = await db.User.findOne({
            where: { 
                username,
                role: 'student'
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'Không tìm thấy sinh viên' });
        }

        // Nếu có yêu cầu đổi mật khẩu
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại' });
            }

            // Kiểm tra mật khẩu hiện tại
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
            }

            // Mã hóa mật khẩu mới
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await user.update({ password: hashedPassword });
        }

        // Nếu có yêu cầu đổi email
        if (email) {
            // Kiểm tra email đã tồn tại chưa
            const existingUser = await db.User.findOne({ 
                where: { 
                    email,
                    username: { [db.Sequelize.Op.ne]: username } // Không tính chính user hiện tại
                } 
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email đã được sử dụng' });
            }

            await user.update({ email });
        }

        // Lấy thông tin cập nhật
        const updatedUser = await db.User.findOne({
            where: { username },
            attributes: ['id', 'username', 'email', 'studentId']
        });

        res.status(200).json({
            message: 'Cập nhật thông tin thành công',
            student: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                studentId: updatedUser.studentId
            }
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin sinh viên:', error);
        res.status(500).json({ error: 'Lỗi server khi cập nhật thông tin' });
    }
};

// Tìm kiếm sinh viên (cho chức năng thêm vào lớp)
exports.searchStudents = async (req, res) => {
    try {
        const { q } = req.query; // Lấy query parameter 'q'

        if (!q) {
            return res.json([]); // Trả về mảng rỗng nếu không có query
        }

        const searchTerm = `%${q}%`; // Chuẩn bị cho LIKE query

        // Tìm kiếm trong bảng Student dựa trên name hoặc studentId
        const students = await Student.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: searchTerm } },
                    { studentId: { [Op.like]: searchTerm } }
                ]
            },
            attributes: ['id', 'name', 'studentId'], // Chỉ lấy các trường cần thiết
            limit: 10 // Giới hạn số lượng kết quả trả về
        });

        res.json(students);

    } catch (err) {
        console.error("Search students error:", err);
        res.status(500).json({ 
            error: "Lỗi khi tìm kiếm sinh viên",
            details: err.message, 
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};