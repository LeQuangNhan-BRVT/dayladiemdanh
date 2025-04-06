"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Classes",
      {
        id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true, unique:true},
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          
        },
        teacherId: {
          // Khóa ngoại liên kết đến giáo viên (User có role='teacher')
          type: Sequelize.INTEGER,
          allowNull: true, // Cho phép lớp chưa có giáo viên
          references: {
            model: "Users", // Tên bảng Users
            key: "id",
          },
          // onDelete: 'SET NULL' // Nếu xóa User(Teacher), teacherId trong Class sẽ thành NULL
          // hoặc để mặc định (phụ thuộc vào cài đặt DB và FK constraint)
        },createdAt: {
          allowNull: false,
          type: Sequelize.DATE, // Sử dụng Sequelize.DATE
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE, // Sử dụng Sequelize.DATE
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
        
      },
      
    );
  },

  async down(queryInterface, Sequelize) {
    
      await queryInterface.dropTable('Classes');
     
  },
};
