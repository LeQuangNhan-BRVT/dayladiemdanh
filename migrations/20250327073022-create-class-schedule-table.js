
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('ClassSchedules', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      classId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Classes', // Tên bảng Classes
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dayOfWeek: {
        type: Sequelize.INTEGER, // 0=Sun, 1=Mon, ..., 6=Sat
        allowNull: false,
      },
      startTime: {
        type: Sequelize.TIME, // HH:MM:SS
        allowNull: false,
      },
      endTime: {
        type: Sequelize.TIME, // HH:MM:SS
        allowNull: false,
      },
      // location: { type: Sequelize.STRING, allowNull: true }, // Tùy chọn
      // isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false }, // Tùy chọn
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // (Tùy chọn) Thêm index để tăng tốc truy vấn lịch học theo lớp và ngày
    // await queryInterface.addIndex('ClassSchedules', ['classId', 'dayOfWeek']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('ClassSchedules');
  }
};