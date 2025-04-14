const { User } = require("../models");
const xlsx = require("xlsx");
const { ValidationError } = require("sequelize");
const { validate } = require("uuid");

exports.uploadUsers = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Chọn file excel để tải lên!" });
  }
  if (
    req.file.mimetype !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
    req.file.mimetype !== "application/vnd.ms-excel" &&
    req.file.mimetype !== "text/csv"
  ) {
    return res
      .status(400)
      .json({ message: "Chỉ hỗ trợ đuôi file .xlsx, .xls, .csv" });
  }
  try {
    //Đọc file từ buffer vì dùng memoryStorage multer
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    //Lay sheet dau tien
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ message: "File excel khong co du lieu" });
    }
    const worksheet = workbook.Sheets[sheetName];
    // Chuyển đổi dữ liệu sheet thành JSON
    // header: 1 -> Dòng đầu tiên là header
    // raw: false -> Chuyển đổi giá trị sang định dạng phù hợp (vd: số, ngày tháng)
    // defval: '' -> Giá trị mặc định cho ô trống
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: "",
    });
    if (!jsonData.length < 2) {
      return res.status(400).json({ message: "File excel không có dữ liệu" });
    }

    const headers = jsonData[0].map((header) =>
      header.toString().toLowerCase().trim()
    );
    const requiredHeaders = ["username", "password", "role"]; //ten cac cot
    //check headers require
    const missingHeaders = requiredHeaders.filter((h) => !headers.include(h));
    if (missingHeaders.length > 0) {
      return res
        .status(400)
        .json({
          message: `File Excel thiếu các cột bắt buộc: ${missingHeaders.join(
            ", "
          )}`,
        });
    }
    const dataRows = jsonData.slice(1);
    const usersToCreate = dataRows
      .map((row, index) => {
        const user = {};
        headers.forEach((header, colIndex) => {
          //lay cac cot trong models/User
          if (
            ["username", "password", "role", "email", "studentId"].includes(
              header
            )
          ) {
            //gan gia tri, xu ly o trong
            const value =
              row[colIndex] !== null && row[colIndex] !== undefined
                ? row[colIndex].toString().trim()
                : null;
            if (
              (header === "email" || header === "studentId") &&
              value === ""
            ) {
              user[header] = null;
            } else if (value !== null) {
              user[header] = value;
            }
          }
        });
        //check require on rows
        if (!user.username || !user.role || !user.password) {
          console.warn(
            `Dong ${
              index + 2
            } trong file excel thieu thong tin username, password, role`
          );
          return null;
        }
        if (user.role?.toLowerCase() !== "student") {
          user.studentId = null; //gan null neu la admin or giao vien
        }
        return user;
      })
      .filter((user) => user !== null); //bo cac dong khong hop le

    if (usersToCreate.length === 0) {
      return res.status(400).json({ message: "Khong co du lieu hop le" });
    }
    // Thêm người dùng vào database sử dụng bulkCreate
    // validate: true -> Áp dụng các validate đã định nghĩa trong model
    // individualHooks: true -> Đảm bảo hook beforeCreate/beforeBulkCreate được gọi cho từng user (để hash password)
    const createdUsers = await User.bulkCreate(usersToCreate, {
      validate: true,
      individualHooks: true,
      fields: ["username", "password", "role", "email", "studentId"],
    });
    res
      .status(201)
      .json({ message: `Them thanh cong ${createdUsers.length} nguoi dung` });
  } catch (error) {
    console.error("Loi upload", error);
    // Xử lý lỗi validation từ Sequelize
    if (error instanceof ValidationError) {
      const errorMessages = error.errors.map((err) => ({
        field: err.path,
        message: err.message,
        value: err.value,
      }));
      // Tìm lỗi cụ thể hơn, ví dụ lỗi unique
      const uniqueError = error.errors.find(
        (err) => err.type === "unique violation"
      );
      if (uniqueError) {
        return res.status(409).json({
          // 409 Conflict
          message: `Lỗi trùng lặp dữ liệu: ${uniqueError.message}. Vui lòng kiểm tra lại file Excel.`,
          errors: errorMessages,
        });
      }
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại file Excel.",
        errors: errorMessages,
      });
    }
    // Xử lý lỗi chung
    res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trên server khi xử lý file." });
  }
};
