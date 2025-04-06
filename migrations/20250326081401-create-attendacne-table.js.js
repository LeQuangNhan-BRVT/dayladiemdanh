// migrations/YYYYMMDDHHMMSS-create-attendances-table.js
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Attendances', { // Tên bảng
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            // --- Đảm bảo có các cột này ---
            classId: { // Cột khóa ngoại cho lớp học
                type: Sequelize.INTEGER,
                allowNull: false, // Không được null
                references: {
                    model: 'Classes', // Tên bảng Classes
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE', // Xóa lớp thì xóa điểm danh
            },
            studentId: { // Cột khóa ngoại cho sinh viên
                type: Sequelize.INTEGER,
                allowNull: false, // Không được null
                references: {
                    model: 'Students', // Tên bảng Students
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE', // Xóa sinh viên thì xóa điểm danh
            },
            // --- Các cột khác ---
            date: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
                allowNull: false, // Nên đặt allowNull: false
            },
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
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Attendances');
    }
};