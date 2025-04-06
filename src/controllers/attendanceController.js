// controllers/attendanceController.js
const QRCode = require("qrcode");
const db = require("../models");
const Attendance = db.Attendance;
const Class = db.Class;
const Student = db.Student;
const ClassSchedule = db.ClassSchedule;
const { Op } = require("sequelize");

// Tạo mã QR cho buổi học
exports.generateQR = async (req, res) => {
  try {
    // Lấy thêm duration từ body, đặt mặc định 15 phút
    const { classId, scheduleId, duration: durationMinutesInput } = req.body;

    // --- DEBUG: Log received duration ---
    console.log(
      `[Backend Debug] Received duration input (req.body.duration):`,
      durationMinutesInput
    );
    const durationMinutes = parseInt(durationMinutesInput, 10) || 15; // Mặc định 15 nếu không có hoặc không hợp lệ
    console.log(
      `[Backend Debug] Parsed durationMinutes (using default 15 if invalid):`,
      durationMinutes
    );
    // -------------------------------------

    if (!classId || !scheduleId) {
      return res
        .status(400)
        .json({ error: "classId và scheduleId là bắt buộc" });
    }
    if (durationMinutes <= 0) {
      return res
        .status(400)
        .json({ error: "Thời gian hiệu lực (duration) phải lớn hơn 0" });
    }

    // Kiểm tra quyền truy cập
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "Bạn không có quyền tạo mã QR" });
    }

    // Kiểm tra lớp học và buổi học
    const classInfo = await db.Class.findOne({
      where: { id: classId },
    });

    if (!classInfo) {
      return res.status(404).json({ error: "Không tìm thấy lớp học" });
    }

    // Kiểm tra nếu là giáo viên thì phải là giáo viên của lớp đó
    if (req.user.role === "teacher" && req.user.id !== classInfo.teacherId) {
      return res
        .status(403)
        .json({ error: "Bạn không phải là giáo viên của lớp này" });
    }

    const schedule = await db.ClassSchedule.findOne({
      where: {
        id: scheduleId,
        classId: classId,
      },
    });

    if (!schedule) {
      return res.status(404).json({ error: "Không tìm thấy buổi học" });
    }

    // Tính toán thời gian hết hạn dựa trên duration
    const nowTimestamp = Date.now();
    const expiresAtTimestamp = nowTimestamp + durationMinutes * 60 * 1000;

    // Tạo QR data với expiresAt thay vì timestamp gốc
    const qrData = JSON.stringify({
      classId,
      scheduleId,
      expiresAt: expiresAtTimestamp, // Nhúng thời gian hết hạn
    });

    // Tạo QR code
    QRCode.toDataURL(qrData, (err, url) => {
      if (err) {
        console.error("QR Generation Error:", err);
        return res.status(500).json({ error: "Lỗi khi tạo mã QR" });
      }
      // Trả về expiresAt đúng
      res.json({
        qrCodeURL: url,
        expiresAt: expiresAtTimestamp,
      });
    });
  } catch (error) {
    console.error("generateQR Error:", error);
    res.status(500).json({ error: "Lỗi server khi tạo mã QR" });
  }
};

// Sinh viên điểm danh
exports.checkIn = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { qrData } = req.body;
    const studentUserId = req.user.id;

    if (!qrData) {
      await transaction.rollback();
      return res.status(400).json({ error: "qrData là bắt buộc" });
    }

    // Giải mã QR data
    let decodedData;
    try {
      decodedData = JSON.parse(qrData);
      // Kiểm tra các trường cần thiết, đặc biệt là expiresAt
      if (
        !decodedData ||
        !decodedData.classId ||
        !decodedData.scheduleId ||
        !decodedData.expiresAt
      ) {
        throw new Error(
          "Dữ liệu QR không hợp lệ hoặc thiếu thông tin expiresAt"
        );
      }
      // Đảm bảo expiresAt là một số
      if (typeof decodedData.expiresAt !== "number") {
        throw new Error("expiresAt trong dữ liệu QR không phải là số");
      }
    } catch (parseError) {
      await transaction.rollback();
      console.error("QR Parse Error:", parseError, "Raw Data:", qrData); // Log lỗi để debug
      return res.status(400).json({ error: "Dữ liệu QR không hợp lệ" });
    }

    // Lấy các giá trị từ QR data
    const { classId, scheduleId, expiresAt } = decodedData;

    // --- DEBUGGING: Log timestamps before check ---
    // Sửa đoạn code kiểm tra thời hạn QR code
    const currentTime = Date.now();
    console.log(
      `[CheckIn Debug] Current Time (Server): ${currentTime} (${new Date(
        currentTime
      ).toISOString()})`
    );
    console.log(
      `[CheckIn Debug] QR Expires At Timestamp: ${expiresAt} (${new Date(
        expiresAt
      ).toISOString()})`
    );
    const isExpired = currentTime > expiresAt;
    console.log(
      `[CheckIn Debug] Is QR Expired? (currentTime > expiresAt): ${isExpired}`
    );

    // Thêm trước và sau phần return error để xác nhận có vào nhánh điều kiện và phản hồi lỗi hay không
    if (isExpired) {
      console.log(`[CheckIn Debug] QR IS EXPIRED! About to return error...`);
      await transaction.rollback();
      const result = res.status(400).json({ error: "Mã QR đã hết hạn" });
      console.log(`[CheckIn Debug] After sending expired error response`);
      return result;
    }
    console.log(`[CheckIn Debug] QR is not expired, continuing...`);

    // --- Tìm các bản ghi liên quan ---
    const student = await db.Student.findOne({
      where: { userId: studentUserId },
      transaction,
    });
    if (!student) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ error: "Không tìm thấy thông tin sinh viên" });
    }

    const classInfo = await db.Class.findOne({
      where: { id: classId },
      transaction,
    });
    if (!classInfo) {
      await transaction.rollback();
      return res.status(404).json({ error: "Không tìm thấy lớp học" });
    }

    const isStudentInClass = await db.ClassStudent.findOne({
      where: { classId: classId, studentId: student.id },
      transaction,
    });
    if (!isStudentInClass) {
      await transaction.rollback();
      return res.status(403).json({ error: "Bạn không thuộc lớp này" });
    }

    const schedule = await db.ClassSchedule.findOne({
      where: { id: scheduleId, classId: classId },
      transaction,
    });
    if (!schedule) {
      await transaction.rollback();
      return res.status(404).json({ error: "Không tìm thấy buổi học" });
    }
    // --- Kết thúc tìm bản ghi ---

    // --- Kiểm tra thời gian điểm danh (Logic mới) ---
    const now = new Date(); // Lấy Date object hiện tại
    const currentHours = now.getHours(); // Giờ hiện tại (theo timezone server)
    const currentMinutes = now.getMinutes(); // Phút hiện tại
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    const startTimeString = schedule.attendanceStartTime || schedule.startTime;
    const endTimeString = schedule.attendanceEndTime || schedule.endTime;

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr || !timeStr.includes(":")) return null;
      const parts = timeStr.split(":");
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return null;
      return hours * 60 + minutes;
    };

    const startTimeInMinutes = parseTimeToMinutes(startTimeString);
    const endTimeInMinutes = parseTimeToMinutes(endTimeString);

    if (startTimeInMinutes === null || endTimeInMinutes === null) {
      console.error(
        `Invalid time format for schedule ${scheduleId}: Start=${startTimeString}, End=${endTimeString}`
      );
      await transaction.rollback();
      return res
        .status(500)
        .json({ error: "Lỗi cấu hình thời gian buổi học." });
    }

    console.log(
      `Check time: Current=${currentTimeInMinutes} (${currentHours}:${currentMinutes}), Start=${startTimeInMinutes} (${startTimeString}), End=${endTimeInMinutes} (${endTimeString})`
    );

    let isTimeValid = false;
    // Xử lý trường hợp endTime qua nửa đêm
    if (endTimeInMinutes < startTimeInMinutes) {
      if (
        currentTimeInMinutes >= startTimeInMinutes ||
        currentTimeInMinutes <= endTimeInMinutes
      ) {
        isTimeValid = true;
      }
    } else {
      // Trường hợp endTime trong cùng ngày
      if (
        currentTimeInMinutes >= startTimeInMinutes &&
        currentTimeInMinutes <= endTimeInMinutes
      ) {
        isTimeValid = true;
      }
    }

    if (!isTimeValid) {
      await transaction.rollback();
      let errorMessage =
        currentTimeInMinutes < startTimeInMinutes
          ? `Chưa đến thời gian điểm danh (Bắt đầu lúc ${startTimeString})`
          : `Đã hết thời gian điểm danh (Kết thúc lúc ${endTimeString})`;
      if (
        endTimeInMinutes < startTimeInMinutes &&
        currentTimeInMinutes > endTimeInMinutes &&
        currentTimeInMinutes < startTimeInMinutes
      ) {
        errorMessage = `Đã hết thời gian điểm danh (Kết thúc lúc ${endTimeString} ngày hôm sau)`;
      }
      return res.status(400).json({ error: errorMessage });
    }
    // --- Kết thúc kiểm tra thời gian ---

    // Kiểm tra đã điểm danh chưa
    const existingAttendance = await db.Attendance.findOne({
      where: { studentId: student.id, scheduleId: scheduleId },
      transaction,
    });
    if (existingAttendance) {
      await transaction.rollback();
      return res.status(400).json({ error: "Bạn đã điểm danh buổi học này" });
    }

    // Tạo bản ghi điểm danh
    const attendance = await db.Attendance.create(
      {
        studentId: student.id,
        classId: classId,
        scheduleId: scheduleId,
        status: "present",
        checkInTime: now, // Lưu Date object đầy đủ
      },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({
      message: "Điểm danh thành công",
      attendance: {
        id: attendance.id,
        studentName: student.name,
        classId: classId,
        scheduleId: scheduleId,
        status: attendance.status,
        checkInTime: attendance.checkInTime,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Lỗi khi điểm danh:", error);
    res.status(500).json({
      error: "Lỗi server khi điểm danh",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

//xem lịch sử điểm danh
exports.getStudentHistory = async (req, res) => {
  try {
    const studentUserId = req.user.id;
    //tim thong tin sv
    const student = await Student.findOne({
      where: { userId: studentUserId },
    });
    if (!student) {
      return res.status(404).json({ error: "Khong co sinh vien nay" });
    }
    //lay lich su diem danh
    const attendanceHistory = await Attendance.findAll({
      where: { studentId: student.id },
      include: [
        {
          model: Class,
          as: "classInfo",
          attributes: ["id", "name"],
        },
        {
          model: ClassSchedule,
          as: "scheduleInfo",
          attributes: ["dayOfWeek", "startTime", "endTime"],
        },
      ],
      order: [["date", "DESC"]], //sap xep thoi gian moi nhat
      attributes: ["date", "createdAt"],
    });
    // Format dữ liệu trả về
    const formattedHistory = attendanceHistory.map((record) => ({
      date: record.date,
      checkinTime: record.createdAt,
      className: record.classInfo.name,
      schedule: record.scheduleInfo
        ? {
            dayOfWeek: record.scheduleInfo.dayOfWeek,
            time: `${record.scheduleInfo.startTime} - ${record.scheduleInfo.endTime}`,
          }
        : null,
    }));

    res.status(200).json({
      studentId: student.studentId,
      totalAttendance: attendanceHistory.length,
      history: formattedHistory,
    });
  } catch (error) {
    console.error("Get attendance history error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Lấy lịch sử điểm danh của sinh viên theo lớp cụ thể
exports.getStudentClassHistory = async (req, res) => {
  try {
    const studentUserId = req.user.id;
    const { classId } = req.params;

    // Tìm thông tin sinh viên
    const student = await Student.findOne({
      where: { userId: studentUserId },
    });

    if (!student) {
      return res.status(404).json({ error: "Student record not found" });
    }

    // Kiểm tra sinh viên có thuộc lớp này không
    const classObj = await Class.findByPk(classId);
    if (!classObj) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isStudentInClass = await classObj.hasStudent(student);
    if (!isStudentInClass) {
      return res
        .status(403)
        .json({ error: "You are not enrolled in this class" });
    }

    // Lấy tổng số buổi học của lớp
    const totalSessions = await ClassSchedule.count({
      where: { classId },
    });

    // Lấy lịch sử điểm danh của lớp này
    const attendanceHistory = await Attendance.findAll({
      where: {
        studentId: student.id,
        classId: classId,
      },
      include: [
        {
          model: ClassSchedule,
          as: "scheduleInfo",
          attributes: ["dayOfWeek", "startTime", "endTime"],
        },
      ],
      order: [["date", "DESC"]],
      attributes: ["date", "createdAt"],
    });

    // Format dữ liệu trả về
    const formattedHistory = attendanceHistory.map((record) => ({
      date: record.date,
      checkinTime: record.createdAt,
      schedule: record.scheduleInfo
        ? {
            dayOfWeek: record.scheduleInfo.dayOfWeek,
            time: `${record.scheduleInfo.startTime} - ${record.scheduleInfo.endTime}`,
          }
        : null,
    }));

    res.status(200).json({
      className: classObj.name,
      studentId: student.studentId,
      totalSessions: totalSessions,
      attendedSessions: attendanceHistory.length,
      attendanceRate: `${(
        (attendanceHistory.length / totalSessions) *
        100
      ).toFixed(2)}%`,
      history: formattedHistory,
    });
  } catch (error) {
    console.error("Get class attendance history error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Giáo viên tùy chỉnh thời gian điểm danh
exports.updateAttendanceTime = async (req, res) => {
  try {
    const { scheduleId, startTime, endTime } = req.body;

    if (!scheduleId || !startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "scheduleId, startTime và endTime là bắt buộc" });
    }

    // Kiểm tra quyền truy cập
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền tùy chỉnh thời gian điểm danh" });
    }

    // Tìm buổi học
    const schedule = await db.ClassSchedule.findOne({
      where: { id: scheduleId },
      include: [
        {
          model: db.Class,
          as: "classInfo",
        },
      ],
    });

    if (!schedule) {
      return res.status(404).json({ error: "Không tìm thấy buổi học" });
    }

    // Kiểm tra nếu là giáo viên thì phải là giáo viên của lớp đó
    if (
      req.user.role === "teacher" &&
      req.user.id !== schedule.classInfo.teacherId
    ) {
      return res
        .status(403)
        .json({ error: "Bạn không phải là giáo viên của lớp này" });
    }

    // Kiểm tra định dạng thời gian
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res
        .status(400)
        .json({ error: "Định dạng thời gian không hợp lệ (HH:MM:SS)" });
    }

    // Kiểm tra thời gian kết thúc phải sau thời gian bắt đầu
    const startTimeObj = new Date(`2000-01-01T${startTime}`);
    const endTimeObj = new Date(`2000-01-01T${endTime}`);
    if (endTimeObj <= startTimeObj) {
      return res
        .status(400)
        .json({ error: "Thời gian kết thúc phải sau thời gian bắt đầu" });
    }

    // Cập nhật thời gian điểm danh
    await schedule.update({
      attendanceStartTime: startTime,
      attendanceEndTime: endTime,
    });

    res.status(200).json({
      message: "Cập nhật thời gian điểm danh thành công",
      schedule: {
        id: schedule.id,
        classId: schedule.classId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        attendanceStartTime: schedule.attendanceStartTime,
        attendanceEndTime: schedule.attendanceEndTime,
      },
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật thời gian điểm danh:", error);
    res
      .status(500)
      .json({ error: "Lỗi server khi cập nhật thời gian điểm danh" });
  }
};
