// controllers/classController.js
const db = require("../models");
const Class = db.Class;
const Student = db.Student;
const User = db.User; // Import User để kiểm tra teacherId
const ClassSchedule = db.ClassSchedule;
const { Op } = require("sequelize");
const xlsx = require('xlsx');

// Tạo lớp học mới (Admin hoặc Teacher)
exports.createClass = async (req, res) => {
  try {
    const { name } = req.body;
    // teacherId có thể được lấy từ req.user nếu là teacher tạo, hoặc từ body nếu admin tạo
    const teacherId =
      req.user.role === "teacher" ? req.user.id : req.body.teacherId;

    if (!name) {
      return res.status(400).json({ error: "Class name is required" });
    }

    // (Tùy chọn) Kiểm tra teacherId có tồn tại và là teacher không
    if (teacherId) {
      const teacher = await User.findOne({
        where: { id: teacherId, role: "teacher" },
      });
      if (!teacher) {
        return res
          .status(400)
          .json({ error: "Invalid teacher ID or user is not a teacher" });
      }
    }

    const newClass = await Class.create({ name, teacherId: teacherId || null });
    res.status(201).json(newClass);
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      const messages = err.errors.map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("Create class error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Lấy tất cả lớp học (Admin hoặc Teacher)
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.findAll({
      include: [
        {
          model: Student,
          as: 'Students', // Thêm alias 'students' theo như đã định nghĩa trong model
          attributes: ['id', 'name', 'studentId'], // Chỉ lấy các trường cần thiết
          through: { attributes: [] }, // Không lấy các trường của bảng trung gian
        },
        {
          model: User,
          as: 'Teacher', // Thêm alias 'Teacher' theo như đã định nghĩa trong model
          attributes: ['id', 'username'], // Chỉ lấy các trường cần thiết
        }
      ],
      order: [['createdAt', 'DESC']], // Sắp xếp theo thời gian tạo mới nhất
    });
    res.json(classes);
  } catch (err) {
    console.error("Get all classes error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Lấy thông tin chi tiết một lớp học (Admin hoặc Teacher)
exports.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const classObj = await Class.findByPk(id, {
      include: [
        {
          model: Student,
          attributes: ["id", "name", "studentId"],
          through: { attributes: [] },
        },
      ],
    });

    if (!classObj) {
      return res.status(404).json({ error: "Class not found" });
    }
    res.json(classObj);
  } catch (err) {
    console.error("Get class by ID error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Thêm sinh viên vào lớp học (Admin hoặc Teacher)
exports.addStudentToClass = async (req, res) => {
  try {
    const { classId, studentId } = req.params; // Lấy từ params hoặc body tùy thiết kế route

    const classObj = await Class.findByPk(classId);
    if (!classObj) {
      return res.status(404).json({ error: "Class not found" });
    }

    const studentObj = await Student.findByPk(studentId); // Tìm student bằng ID của bảng Student
    if (!studentObj) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Kiểm tra xem sinh viên đã có trong lớp chưa
    const isAlreadyInClass = await classObj.hasStudent(studentObj);
    if (isAlreadyInClass) {
      return res.status(400).json({ error: "Student already in this class" });
    }

    await classObj.addStudent(studentObj); // Thêm sinh viên vào lớp

    res.status(200).json({ message: "Student added to class successfully" });
  } catch (err) {
    console.error("Add student to class error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Xóa sinh viên khỏi lớp học (Admin hoặc Teacher)
exports.removeStudentFromClass = async (req, res) => {
  try {
    const { classId, studentId } = req.params;

    const classObj = await Class.findByPk(classId);
    if (!classObj) {
      return res.status(404).json({ error: "Class not found" });
    }

    const studentObj = await Student.findByPk(studentId);
    if (!studentObj) {
      return res.status(404).json({ error: "Student not found" });
    }

    const isStudentInClass = await classObj.hasStudent(studentObj);
    if (!isStudentInClass) {
      return res.status(404).json({ error: "Student not found in this class" });
    }

    await classObj.removeStudent(studentObj); // Xóa sinh viên khỏi lớp

    res
      .status(200)
      .json({ message: "Student removed from class successfully" });
  } catch (err) {
    console.error("Remove student from class error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Tạo buổi học mới
exports.createSchedule = async (req, res) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { classId } = req.params;
        const { dayOfWeek, startTime, endTime } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (dayOfWeek === undefined || !startTime || !endTime) {
            await transaction.rollback();
            return res.status(400).json({
                error: "Ngày trong tuần, thời gian bắt đầu, thời gian kết thúc phải được nhập"
            });
        }

        // Kiểm tra classId có tồn tại không
        const classInfo = await db.Class.findOne({
            where: { id: classId },
            transaction
        });

        if (!classInfo) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Không tìm thấy lớp học' });
        }

        // Kiểm tra quyền truy cập
        if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
            await transaction.rollback();
            return res.status(403).json({ error: 'Bạn không có quyền tạo buổi học' });
        }

        // Kiểm tra nếu là giáo viên thì phải là giáo viên của lớp đó
        if (req.user.role === 'teacher' && req.user.id !== classInfo.teacherId) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Bạn không phải là giáo viên của lớp này' });
        }

        // Tạo buổi học mới
        const schedule = await db.ClassSchedule.create({
            classId,
            dayOfWeek,
            startTime,
            endTime
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            message: 'Tạo buổi học thành công',
            schedule: {
                id: schedule.id,
                classId: schedule.classId,
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime
            }
        });

    } catch (error) {
        await transaction.rollback();
        if (error.name === "SequelizeValidationError") {
            const messages = error.errors.map(e => e.message);
            return res.status(400).json({ error: messages.join(", ") });
        }
        console.error('Lỗi khi tạo buổi học:', error);
        // Cập nhật response lỗi để cung cấp thêm chi tiết
        res.status(500).json({ 
            error: 'Lỗi server khi tạo buổi học', 
            details: error.message, 
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
};

// Lấy tất cả lịch học của một lớp (Teacher/Admin)
exports.getClassSchedules = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const classObj = await Class.findByPk(classId);
    if (!classObj) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Kiểm tra quyền xem (Admin hoặc đúng Teacher của lớp)
    // Hoặc có thể cho phép Student xem lịch học của lớp họ tham gia (tùy yêu cầu)
    // if (userRole !== 'admin' && classObj.teacherId !== userId) {
    //     // Logic kiểm tra student có trong lớp không nếu muốn cho student xem
    //     return res.status(403).json({ error: 'You do not have permission to view schedules for this class' });
    // }

    const schedules = await ClassSchedule.findAll({
      where: { classId: classId },
      order: [
        ["dayOfWeek", "ASC"],
        ["startTime", "ASC"],
      ], // Sắp xếp theo ngày và giờ bắt đầu
    });
    res.json(schedules);
  } catch (error) {
    console.error("Get class schedules error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Cập nhật một lịch học cụ thể (Teacher/Admin)
exports.updateSchedule = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { classId, scheduleId } = req.params;
    const { dayOfWeek, startTime, endTime } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Tìm lịch học cần cập nhật
    const schedule = await ClassSchedule.findOne({
      where: { id: scheduleId, classId: classId }, // Đảm bảo schedule thuộc đúng class
      include: [{ model: Class, as: "classInfo", attributes: ["teacherId"] }], // Lấy teacherId của lớp
      transaction,
    });

    if (!schedule) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ error: "Schedule not found for this class" });
    }

    // 2. Kiểm tra quyền cập nhật
    if (userRole !== "admin" && schedule.classInfo.teacherId !== userId) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ error: "You do not have permission to update this schedule" });
    }

    // 3. Cập nhật lịch học (chỉ cập nhật các trường được cung cấp)
    const updatedData = {};
    if (dayOfWeek !== undefined) updatedData.dayOfWeek = dayOfWeek;
    if (startTime !== undefined) updatedData.startTime = startTime;
    if (endTime !== undefined) updatedData.endTime = endTime;

    // Kiểm tra lại endTime > startTime nếu cả hai đều được cập nhật
    const finalStartTime = updatedData.startTime || schedule.startTime;
    const finalEndTime = updatedData.endTime || schedule.endTime;
    if (finalEndTime <= finalStartTime) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ error: "End time must be after start time" });
    }

    const updatedSchedule = await schedule.update(updatedData, { transaction });

    await transaction.commit();
    res.json(updatedSchedule);
  } catch (error) {
    await transaction.rollback();
    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("Update schedule error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error while updating schedule" });
  }
};

// Xóa một lịch học cụ thể (Teacher/Admin)
exports.deleteSchedule = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { classId, scheduleId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Tìm lịch học cần xóa
    const schedule = await ClassSchedule.findOne({
      where: { id: scheduleId, classId: classId },
      include: [{ model: Class, as: "classInfo", attributes: ["teacherId"] }],
      transaction,
    });

    if (!schedule) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ error: "Schedule not found for this class" });
    }

    // 2. Kiểm tra quyền xóa
    if (userRole !== "admin" && schedule.classInfo.teacherId !== userId) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this schedule" });
    }

    // 3. Xóa lịch học
    await schedule.destroy({ transaction });

    await transaction.commit();
    res.status(204).send(); // 204 No Content - Xóa thành công
  } catch (error) {
    await transaction.rollback();
    console.error("Delete schedule error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error while deleting schedule" });
  }
};

// Lấy danh sách lớp học của giáo viên đang đăng nhập
exports.getTeacherClasses = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Không tìm thấy thông tin người dùng" });
        }

        const teacherId = req.user.id;
        console.log('Teacher ID:', teacherId);

        if (!teacherId) {
            return res.status(400).json({ error: "ID giáo viên không hợp lệ" });
        }

        const classes = await Class.findAll({
            where: { teacherId },
            include: [
                {
                    model: Student,
                    as: 'Students',
                    attributes: ['id', 'name', 'studentId'],
                    through: { attributes: [] }, 
                    required: false // LEFT JOIN để lấy cả lớp không có sinh viên
                }
            ],
            order: [['createdAt', 'DESC']],
        });

        console.log(`Tìm thấy ${classes.length} lớp học của giáo viên ${teacherId}`);
        res.json(classes);
    } catch (err) {
        console.error("Lỗi khi lấy danh sách lớp học của giáo viên:", err);
        // Thêm chi tiết lỗi vào response để dễ debug hơn trên Postman/client
        res.status(500).json({ 
            error: "Lỗi server khi lấy danh sách lớp học", 
            details: err.message, 
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined // Chỉ hiển thị stack trace khi ở development
        });
    }
};

// Lấy danh sách sinh viên của một lớp
exports.getClassStudents = async (req, res) => {
    try {
        const { classId } = req.params;
        const classObj = await Class.findByPk(classId, {
            include: [{
                model: Student,
                as: 'Students', // Đảm bảo alias này khớp với định nghĩa trong Class.associate
                attributes: ['id', 'name', 'studentId'], // Lấy các trường cần thiết của Student
                through: { attributes: [] } // Không lấy thông tin từ bảng trung gian ClassStudent
            }],
            // Không cần include Teacher ở đây
        });

        if (!classObj) {
            return res.status(404).json({ error: "Class not found" });
        }

        // classObj.Students sẽ là mảng các sinh viên thuộc lớp đó
        res.json(classObj.Students || []); // Trả về mảng rỗng nếu không có sinh viên
    } catch (err) {
        console.error("Get class students error:", err);
        res.status(500).json({ 
            error: "Lỗi khi lấy danh sách sinh viên của lớp", 
            details: err.message, 
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

// Thêm chức năng upload file Excel để thêm sinh viên vào lớp
exports.bulkAddStudentsToClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const userId = req.user.id; // Lấy từ middleware xác thực
        const userRole = req.user.role;

        // 1. Kiểm tra file upload
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng chọn file Excel chứa danh sách mã số sinh viên.' });
        }
        // Có thể thêm kiểm tra mimetype nếu cần

        // 2. Tìm lớp học
        const classObj = await Class.findByPk(classId);
        if (!classObj) {
            return res.status(404).json({ error: "Class not found" });
        }

        // 3. Kiểm tra quyền (Admin hoặc Teacher của lớp)
        if (userRole !== 'admin' && classObj.teacherId !== userId) {
             return res.status(403).json({ error: 'Bạn không có quyền thêm sinh viên vào lớp này.' });
        }

        // 4. Đọc file Excel
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return res.status(400).json({ message: 'File Excel trống hoặc không có sheet nào.' });
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

        if (jsonData.length < 2) {
            return res.status(400).json({ message: 'File Excel không có dữ liệu sinh viên (cần ít nhất dòng header và một dòng mã số sinh viên).' });
        }

        // 5. Trích xuất danh sách mã số sinh viên (studentId)
        const headers = jsonData[0]?.map(h => h?.toString().toLowerCase().trim());
        if (!headers || headers.length === 0) {
            return res.status(400).json({ message: "File Excel không có dòng header hoặc header trống." });
        }

        // Tìm index của cột 'studentid'
        const studentIdColumnIndex = headers.indexOf('studentid');
        
        if (studentIdColumnIndex === -1) {
             return res.status(400).json({ message: "File Excel phải có cột header là 'studentid' (không phân biệt hoa thường)." });
        }

        // Lấy studentId từ đúng cột đã tìm được
        const studentIdsFromFile = jsonData.slice(1) // Bỏ qua header
                                         .map(row => row[studentIdColumnIndex]?.toString().trim()) // Lấy giá trị từ cột studentIdColumnIndex
                                         .filter(id => id && id !== ''); // Lọc bỏ các giá trị null, undefined, hoặc rỗng

        if (studentIdsFromFile.length === 0) {
            return res.status(400).json({ message: 'Không tìm thấy mã số sinh viên hợp lệ nào trong cột studentid của file.' });
        }

        // 6. Tìm các đối tượng Student tương ứng trong database
        const foundStudents = await Student.findAll({
            where: { studentId: { [Op.in]: studentIdsFromFile } }
        });

        const foundStudentIds = foundStudents.map(s => s.studentId);
        const notFoundStudentIds = studentIdsFromFile.filter(id => !foundStudentIds.includes(id));

        // 7. Thêm sinh viên vào lớp học
        let addedCount = 0;
        let alreadyInClassCount = 0;
        const studentsToAdd = [];

        // Lọc ra những sinh viên tìm thấy nhưng chưa có trong lớp
        if (foundStudents.length > 0) {
            // Lấy ID của student đã có trong lớp *hiện tại*
            const currentStudentIdsInClass = (await classObj.getStudents({ attributes: ['id'], joinTableAttributes: [] })).map(s => s.id); 

            for (const student of foundStudents) {
                // Chỉ thêm student nếu ID của họ chưa có trong danh sách ID của lớp này
                if (!currentStudentIdsInClass.includes(student.id)) { 
                    studentsToAdd.push(student);
                } else {
                    alreadyInClassCount++; // Đếm những người đã có trong lớp
                }
            }
        }

        if (studentsToAdd.length > 0) {
            await classObj.addStudents(studentsToAdd); // Chỉ thêm những người chưa có
            addedCount = studentsToAdd.length;
        }

        // 8. Trả về kết quả chi tiết
        let message = `Đã xử lý xong file. Thêm thành công ${addedCount} sinh viên.`;
        const details = {};
        if (alreadyInClassCount > 0) {
             details.alreadyInClass = `Có ${alreadyInClassCount} sinh viên đã ở trong lớp từ trước.`;
        }
        if (notFoundStudentIds.length > 0) {
            details.notFound = `Không tìm thấy ${notFoundStudentIds.length} sinh viên trong hệ thống với mã số: ${notFoundStudentIds.join(', ')}.`;
             message = `Đã xử lý xong file. Thêm thành công ${addedCount} sinh viên. Lưu ý: Một số mã sinh viên không tìm thấy hoặc đã có trong lớp.`;
        }

        res.status(200).json({
            message: message,
            details: details,
            addedCount: addedCount,
            notFoundCount: notFoundStudentIds.length,
            alreadyInClassCount: alreadyInClassCount,
        });

    } catch (error) {
        console.error("Lỗi khi thêm sinh viên hàng loạt vào lớp:", error);
        // Phân biệt lỗi đọc file hoặc lỗi DB
        if (error.name === 'SyntaxError' || error instanceof TypeError) { // Ví dụ lỗi có thể xảy ra khi đọc file hoặc xử lý dữ liệu
             return res.status(400).json({ message: 'Định dạng file Excel không hợp lệ hoặc file bị lỗi.' });
        }
        res.status(500).json({ message: 'Đã xảy ra lỗi trên server khi xử lý file.' });
    }
};