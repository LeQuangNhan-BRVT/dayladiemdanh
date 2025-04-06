// migrations/YYYYMMDDHHMMSS-add-scheduleId-to-attendances.js
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Hàm UP: Thêm cột scheduleId vào bảng Attendances
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "Attendances", // Tên bảng cần thêm cột
      "scheduleId", // Tên cột mới
      {
        type: Sequelize.INTEGER, // Kiểu dữ liệu khớp với khóa chính của ClassSchedules
        allowNull: true, // Khớp với allowNull trong định nghĩa model association
        // Đặt là false nếu bắt buộc
        references: {
          model: "ClassSchedules", // Tên bảng được tham chiếu
          key: "id", // Khóa chính của bảng được tham chiếu
        },
        onUpdate: "CASCADE", // Nếu id trong ClassSchedules thay đổi -> cập nhật
        onDelete: "SET NULL", // Nếu buổi học bị xóa -> đặt scheduleId thành NULL
        // Hoặc 'CASCADE' nếu muốn xóa luôn điểm danh khi xóa buổi học
        // Nên chọn SET NULL nếu allowNull: true
        // Nên chọn CASCADE nếu allowNull: false
      }
    );
  },

  // Hàm DOWN: Xóa cột scheduleId khỏi bảng Attendances (hoàn tác)
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "Attendances", // Tên bảng cần xóa cột
      "scheduleId" // Tên cột cần xóa
    );
  },
};
