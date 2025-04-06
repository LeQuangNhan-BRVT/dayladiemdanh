// migrations/YYYYMMDDHHMMSS-create-users-table.js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Hàm UP: Định nghĩa cách tạo bảng Users
  async up (queryInterface, Sequelize) { // Tham số thứ hai là Sequelize
    await queryInterface.createTable('Users', { // Tên bảng trong DB
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER // Sử dụng Sequelize.INTEGER
      },
      username: {
        type: Sequelize.STRING, // Sử dụng Sequelize.STRING
        allowNull: false,
        unique: true, // Trong migration, unique chỉ cần true là đủ
      },
      password: {
        type: Sequelize.STRING, // Sử dụng Sequelize.STRING
         allowNull: false,
      },
      role: {
        type: Sequelize.STRING, // Sử dụng Sequelize.STRING
        allowNull: false,
        defaultValue: 'student'
      },
      email: {
          type: Sequelize.STRING, // Sử dụng Sequelize.STRING
          allowNull: true,
          unique: true,
      },
      studentId: {
        type: Sequelize.STRING, // Sử dụng Sequelize.STRING
        allowNull: true,
        unique: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE, // Sử dụng Sequelize.DATE
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE, // Sử dụng Sequelize.DATE
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
      
    });
  },

  // Hàm DOWN: Định nghĩa cách xóa bảng Users
  async down (queryInterface, Sequelize) { // Tham số thứ hai là Sequelize
    await queryInterface.dropTable('Users'); // Nên dùng tên bảng chính xác 'Users' (chữ U hoa)
  }
};