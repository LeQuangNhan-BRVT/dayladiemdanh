// migrations/YYYYMMDDHHMMSS-create-class-student-table.js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Hàm UP: Định nghĩa cách tạo bảng ClassStudent
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('ClassStudent', { // Tên bảng trung gian
      // Cột classId: Khóa ngoại tham chiếu đến bảng Classes
      classId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true, // Một phần của khóa chính phức hợp
        references: {
          model: 'Classes', // Tên bảng Classes trong database
          key: 'id',       // Tham chiếu đến cột id của bảng Classes
        },
        onUpdate: 'CASCADE', // Nếu id trong Classes thay đổi, cập nhật ở đây
        onDelete: 'CASCADE', // Nếu một Class bị xóa, xóa các bản ghi liên quan trong ClassStudent
      },
      // Cột studentId: Khóa ngoại tham chiếu đến bảng Students
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true, // Một phần của khóa chính phức hợp
        references: {
          model: 'Students', // Tên bảng Students trong database
          key: 'id',        // Tham chiếu đến cột id của bảng Students
        },
        onUpdate: 'CASCADE', // Nếu id trong Students thay đổi, cập nhật ở đây
        onDelete: 'CASCADE', // Nếu một Student bị xóa, xóa các bản ghi liên quan trong ClassStudent
      },
      // Cột createdAt: Thời điểm bản ghi được tạo
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') // Giá trị mặc định là thời điểm hiện tại
      },
      // Cột updatedAt: Thời điểm bản ghi được cập nhật lần cuối
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') // Tự động cập nhật
      }
      // Không cần cột id riêng cho bảng trung gian này,
      // vì cặp (classId, studentId) đã là duy nhất và có thể dùng làm khóa chính phức hợp.
    });

    // (Tùy chọn) Thêm index để tăng tốc độ truy vấn nếu cần
    // await queryInterface.addIndex('ClassStudent', ['classId']);
    // await queryInterface.addIndex('ClassStudent', ['studentId']);
  },

  // Hàm DOWN: Định nghĩa cách xóa bảng ClassStudent (hoàn tác hàm up)
  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('ClassStudent');
  }
};