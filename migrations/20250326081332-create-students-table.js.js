"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Students",
      {
        id: {type: Sequelize.INTEGER, unique:true, primaryKey: true, autoIncrement: true, allowNull: false},
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          
        },
        studentId: {
          // Mã số sinh viên, định danh chính của sinh viên
          type: Sequelize.STRING,
          allowNull: false,
          
          
        },
        email: {
          // Email sinh viên, có thể đồng bộ với User.email
          type: Sequelize.STRING,
          allowNull: true,
          
        },
        userId: {
          // Khóa ngoại bắt buộc liên kết đến User tương ứng
          type: Sequelize.INTEGER,
          allowNull: false,
          
          references: {
            model: "Users",
            key: "id",
          },
          onDelete: "CASCADE", // Nếu xóa User, xóa luôn Student profile
          onUpdate: "CASCADE",
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
      },
      
    );
  },

  async down(queryInterface, Sequelize) {
    
      await queryInterface.dropTable('Students');
     
  },
};
