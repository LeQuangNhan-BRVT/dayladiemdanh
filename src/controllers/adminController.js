//src/controllers/adminController
const { where, Op } = require("sequelize");
const xlsx = require("xlsx");
const { ValidationError } = require("sequelize");
const db = require("../models");
const User = db.User;
const Student = db.Student;
const bcrypt = require("bcrypt");
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
      // Kiểm tra định dạng studentId 
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
    // REMOVE MANUAL HASHING - Rely on the beforeCreate hook in the User model
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    // --- DATABASE OPERATIONS (trong transaction) ---
    // Tạo user
    const newUser = await User.create(
      {
        username: finalUsername, 
        // Pass the PLAIN TEXT password directly to User.create
        // The beforeCreate hook will handle hashing.
        password: password, 
        role,
        email: email || null, 
        studentId: finalStudentId, 
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

    await transaction.commit(); 
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

exports.uploadUsers = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Chọn file excel để tải lên!" });
  }
  if (
    req.file.mimetype !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
    req.file.mimetype !== "application/vnd.ms-excel"
  ) {
    return res
      .status(400)
      .json({ message: "Chỉ hỗ trợ đuôi file .xlsx, .xls" });
  }

  try {
    // 1. Đọc file Excel
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        return res.status(400).json({ message: "File excel không có dữ liệu hoặc sheet." });
    }
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      header: 1, raw: false, defval: "",
    });

    // 2. Kiểm tra dữ liệu và Headers
    if (jsonData.length < 2) {
        return res.status(400).json({ message: "File excel phải chứa ít nhất dòng header và một dòng dữ liệu người dùng." });
    }
    const headers = jsonData[0].map((header) => header.toString().toLowerCase().trim());
    const requiredBaseHeaders = ["username", "password", "role"];
    const studentSpecificRequiredHeaders = ["studentid", "name"]; // Name và studentid bắt buộc cho student

    // Kiểm tra header cơ bản
    let allRequiredBasePresent = true;
    const missingRequiredBase = [];
     for (const requiredHeader of requiredBaseHeaders) {
       if (!headers.includes(requiredHeader)) {
         allRequiredBasePresent = false;
         missingRequiredBase.push(requiredHeader);
       }
     }
     if (!allRequiredBasePresent) {
       return res.status(400).json({
         message: `File Excel thiếu các cột cơ bản bắt buộc: ${missingRequiredBase.join(", ")}. Các cột tìm thấy: ${headers.join(', ')}`
       });
     }
     // Không kiểm tra header student ở đây, sẽ kiểm tra theo từng dòng

    // 3. Chuẩn bị dữ liệu User và Student từ các dòng
    const dataToProcess = jsonData.slice(1).map((row, index) => {
      const rowData = {};
      headers.forEach((header, colIndex) => {
        const value = row[colIndex] !== null && row[colIndex] !== undefined ? row[colIndex].toString().trim() : null;
        rowData[header] = value; // Key chữ thường
      });

      // Kiểm tra trường cơ bản
      if (!rowData.username || !rowData.password || !rowData.role) {
        console.warn(`[Admin Upload - Row ${index + 2}] Thiếu giá trị cho username, password hoặc role. Bỏ qua.`);
        return null;
      }

      let finalUsername = rowData.username;
      let finalStudentId = null;
      let studentPayload = null; // Object để tạo Student record

      if (rowData.role?.toLowerCase() === 'student') {
          // Kiểm tra các header cần thiết cho student
          for(const studentHeader of studentSpecificRequiredHeaders) {
              if (!headers.includes(studentHeader)) {
                  console.warn(`[Admin Upload - Row ${index + 2}] File thiếu cột header '${studentHeader}' cần thiết cho student. Bỏ qua dòng này.`);
                  return null;
              }
          }
          // Kiểm tra giá trị studentid và name
          const studentIdValue = rowData.studentid;
          const nameValue = rowData.name;
          if (!studentIdValue || studentIdValue === "") {
               console.warn(`[Admin Upload - Row ${index + 2}] Role là student nhưng giá trị cột 'studentid' bị thiếu hoặc rỗng. Bỏ qua.`);
               return null;
          }
          if (!nameValue || nameValue === "") {
              console.warn(`[Admin Upload - Row ${index + 2}] Role là student nhưng giá trị cột 'name' bị thiếu hoặc rỗng. Bỏ qua.`);
              return null;
          }

          finalUsername = studentIdValue;
          finalStudentId = studentIdValue;
          // Chuẩn bị payload cho Student record
          studentPayload = {
              studentId: finalStudentId,
              name: nameValue,
              email: rowData.email || null
              // userId sẽ được thêm sau khi User được tạo
          };
      }

      // Trả về object chứa cả thông tin User và Student (nếu có)
      return {
          userData: {
              username: finalUsername,
              password: rowData.password,
              role: rowData.role,
              email: rowData.email || null,
              studentId: finalStudentId,
          },
          studentPayload: studentPayload // Sẽ là null nếu không phải student
      };

    }).filter(item => item !== null);

    // 4. Kiểm tra nếu không có dữ liệu hợp lệ
    if (dataToProcess.length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu người dùng hợp lệ nào trong file để thêm." });
    }

    // 5. Thực hiện tạo User và Student trong Transaction
    const transaction = await db.sequelize.transaction();
    let createdUserCount = 0;
    let createdStudentCount = 0;

    try {
      // Chuẩn bị danh sách User để tạo
      const usersToBulkCreate = dataToProcess.map(item => item.userData);
      console.log("[Admin Upload] Chuẩn bị tạo Users:", JSON.stringify(usersToBulkCreate, null, 2));

      // Tạo Users
      const createdUserResults = await User.bulkCreate(usersToBulkCreate, {
        validate: true,
        individualHooks: true, // Hash password
        transaction: transaction
      });
      createdUserCount = createdUserResults.length;

      // Chuẩn bị danh sách Student để tạo
      const studentsToBulkCreate = [];
      createdUserResults.forEach((createdUser) => {
          // Tìm lại payload student tương ứng từ dataToProcess
          const originalItem = dataToProcess.find(item => item.userData.username === createdUser.username);
          if (createdUser.role === 'student' && originalItem?.studentPayload) {
              studentsToBulkCreate.push({
                  ...originalItem.studentPayload,
                  userId: createdUser.id // Thêm userId vừa tạo
              });
          }
      });

      // Tạo Students nếu có
      if (studentsToBulkCreate.length > 0) {
          console.log("[Admin Upload] Chuẩn bị tạo Students:", JSON.stringify(studentsToBulkCreate, null, 2));
           // Có thể thêm kiểm tra trùng studentId trong bảng Student ở đây nếu muốn chặt chẽ hơn
           // const existingStudentCheck = await Student.findAll(...)
           // Lọc ra những student chưa tồn tại trước khi bulkCreate
           // ... (logic kiểm tra và lọc) ...
          const createdStudentResults = await Student.bulkCreate(studentsToBulkCreate, {
              validate: true, // Validate model Student
              transaction: transaction
          });
          createdStudentCount = createdStudentResults.length;
      }

      // Commit transaction nếu mọi thứ thành công
      await transaction.commit();

      res.status(201).json({
          message: `Đã thêm thành công ${createdUserCount} người dùng và ${createdStudentCount} hồ sơ sinh viên.`
      });

    } catch (error) {
      // Rollback transaction nếu có lỗi
      await transaction.rollback();

      // Xử lý lỗi chi tiết hơn
      if (error instanceof ValidationError || error.name === 'SequelizeUniqueConstraintError') {
          const errorMessages = error.errors.map(err => ({
              field: err.path,
              message: err.message,
              value: err.value
          }));
           let specificErrorMsg = "Lỗi validation hoặc trùng lặp dữ liệu khi tạo User hoặc Student.";
           const uniqueError = error.errors.find(err => err.type === 'unique violation' || err.validatorKey === 'not_unique');
           if (uniqueError) {
               specificErrorMsg = `Lỗi trùng lặp dữ liệu: ${uniqueError.message}.`;
                // Xác định lỗi trùng của bảng nào (User hay Student) dựa vào uniqueError.path
               if (uniqueError.path === 'PRIMARY' && error.original?.table === 'students') { // Ví dụ kiểm tra lỗi PK của Students
                  specificErrorMsg = `Lỗi trùng lặp Student ID trong bảng Students: ${uniqueError.message}.`;
               } else if (uniqueError.path === 'users_studentId_key' || uniqueError.path === 'studentId'){
                  specificErrorMsg = `Lỗi trùng lặp Student ID trong bảng Users: ${uniqueError.message}.`;
               } // Thêm các kiểm tra khác nếu cần
               return res.status(409).json({ message: specificErrorMsg, errors: errorMessages });
           }
           specificErrorMsg = `Dữ liệu không hợp lệ: ${error.errors.map(e => e.message).join(', ')}`;
           return res.status(400).json({ message: specificErrorMsg, errors: errorMessages });
       }
       // Lỗi DB hoặc lỗi không xác định khác
       console.error("Lỗi khi thực hiện bulk create User/Student:", error);
       res.status(500).json({ message: "Lỗi máy chủ khi thêm dữ liệu vào database." });
    }

  } catch (error) {
    // Lỗi khi đọc file
    console.error("Lỗi xử lý upload file:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi server khi xử lý file." });
  }
};
