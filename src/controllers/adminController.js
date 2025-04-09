const { where, Op } = require("sequelize");
const db = require("../models");
const User = db.User;
const Student = db.Student;
const bcrypt = require("bcrypt");
const ClassSchedule = require("../models/ClassSchedule");
const jwt = require("jsonwebtoken");

//admin tao cac users khac bao gom: student, teacher, other admin
exports.createUser = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { username, password, role, email, studentId, name } = req.body;

    // --- VALIDATION ---
    if (!username || !password || !role) {
      // Bỏ transaction.rollback() ở đây vì transaction chưa bắt đầu hoặc không cần thiết
      return res
        .status(400)
        .json({ error: "Tên đăng nhập, mật khẩu và vai trò không được trống!" });
    }
    if (!["student", "teacher", "admin"].includes(role)) {
      // Bỏ transaction.rollback()
      return res.status(400).json({ error: "Vai trò không hợp lệ!" });
    }

    let finalUsername = username; // Gán username ban đầu
    let finalStudentId = null; // Khởi tạo studentId

    if (role === "student") {
      if (!studentId) {
        // Bỏ transaction.rollback()
        return res.status(400).json({ error: "Mã số sinh viên không được trống khi vai trò là student" });
      }
      if (!name) {
        // Bỏ transaction.rollback()
        return res.status(400).json({ error: "Họ tên không được trống khi vai trò là student" });
      }
      // Kiểm tra định dạng studentId SỚM HƠN
      if (!/^DH\d{8}$/.test(studentId)) {
        // Bỏ transaction.rollback()
        return res.status(400).json({ error: "Mã SV phải có dạng DH + 8 số" });
      }
      finalUsername = studentId; // Sử dụng studentId làm username cho sinh viên
      finalStudentId = studentId; // Lưu studentId để tạo bản ghi Student
    }

    // --- DUPLICATE CHECK (Sau khi xác định finalUsername) ---
    const orConditions = [];
    if (finalUsername) {
        orConditions.push({ username: finalUsername });
    }
    if (email) { // Chỉ kiểm tra email nếu nó được cung cấp
        orConditions.push({ email: email });
    }

    if (orConditions.length > 0) {
        const existingUser = await User.findOne({
          where: {
            [Op.or]: orConditions,
          },
          // Không cần transaction ở đây vì chỉ là đọc
        });

        if (existingUser) {
          let errorMessage = "Thông tin đã tồn tại.";
          if (existingUser.username === finalUsername) {
              errorMessage = "Tên đăng nhập đã tồn tại";
          } else if (email && existingUser.email === email) {
              errorMessage = "Email đã được sử dụng";
          }
          // Bỏ transaction.rollback()
          return res.status(400).json({ error: errorMessage });
        }
    }


    // --- PASSWORD HASHING ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- DATABASE OPERATIONS (trong transaction) ---
    // Tạo user
    const newUser = await User.create(
      {
        username: finalUsername, // Sử dụng finalUsername đã xác định
        password: hashedPassword,
        role,
        email: email || null, // Đảm bảo email là null nếu không có
        studentId: finalStudentId, // Sử dụng finalStudentId đã xác định
      },
      { transaction }
    );

    // Tạo student nếu role là student
    if (role === "student") {
      await Student.create(
        {
          userId: newUser.id,
          studentId: finalStudentId, // Đảm bảo dùng đúng studentId
          name,
          email: email || null, // Đảm bảo email là null nếu không có
        },
        { transaction }
      );
    }

    // --- COMMIT TRANSACTION ---
    await transaction.commit();

    // --- SUCCESS RESPONSE ---
    res.status(201).json({
      message: "Tạo người dùng thành công",
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        email: newUser.email
      },
    });

  } catch (error) {
    // Rollback transaction nếu có lỗi trong quá trình create
    await transaction.rollback();

    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors[0]?.path || "field";
      // Cải thiện thông báo lỗi
      let readableField = field;
      if (field === 'username') readableField = 'Tên đăng nhập';
      if (field === 'email') readableField = 'Email';
      if (field === 'studentId' && error.parent?.sqlMessage?.includes('Users_studentId_key')) readableField = 'Mã số sinh viên (trong bảng User)';
      if (field === 'studentId' && error.parent?.sqlMessage?.includes('Students_pkey')) readableField = 'Mã số sinh viên (trong bảng Student)';


      return res.status(400).json({ error: `${readableField} đã tồn tại` });
    }
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("Create user error:", error); // Giữ lại log lỗi chi tiết ở backend
    res.status(500).json({ error: "Lỗi máy chủ nội bộ. Không thể tạo người dùng." }); // Thông báo lỗi chung chung hơn cho client
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Hay nhap tai khoan va mat khau" });
    }

    const admin = await User.findOne({
      where: {
        username,
        role: "admin",
      },
    });

    if (!admin) {
      return res.status(401).json({ error: "Tai khoan admin khong ton tai" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Mat khau sai" });
    }

    // JWT
    const payload = {
      id: admin.id,
      role: admin.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Tra thong tin admin
    const responseUser = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      email: admin.email,
    };

    res.status(200).json({
      message: "Dang nhap thanh cong",
      user: responseUser,
      token,
    });
  } catch (error) {
    console.log("Dang nhap admin that bai:", error);
    res.status(500).json({ error: "Server loi!" });
  }
};
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await db.User.findAll({
      where: { role: "teacher" },
      attributes: ["id", "username", "email"],
    });
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server khi lấy danh sách giảng viên" });
  }
};
exports.updateTeacher = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { username, email } = req.body;

    const teacher = await User.findOne({
      where: { id, role: "teacher" },
    });
    if (req.body.classes) {
      await teacher.setClasses(req.body.classes, { transaction });
    }
    if (!teacher) {
      return res.status(404).json({ error: "Giáo viên không tồn tại" });
    }

    await transaction.commit(); // ✅ Commit khi thành công
    res.json(updatedTeacher);
  } catch (error) {
    console.error("Lỗi cập nhật giáo viên:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};

// Xóa giáo viên
exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await User.findOne({
      where: { id, role: "teacher" },
    });
    const classes = await teacher.getClasses();
    if (classes.length > 0) {
      return res.status(400).json({
        error: "Không thể xóa giáo viên đang phụ trách lớp học",
      });
    }
    if (!teacher) {
      return res.status(404).json({ error: "Giáo viên không tồn tại" });
    }

    await teacher.destroy();
    res.status(204).send();
  } catch (error) {
    console.error("Lỗi xóa giáo viên:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
};
