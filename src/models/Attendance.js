// models/Attendance.js
'use strict';
module.exports = (sequelize, DataTypes) => {
    const Attendance = sequelize.define('Attendance', {
        // Không cần định nghĩa id, classId, studentId ở đây
        // Chúng sẽ được tự động thêm thông qua associations và primary key
        date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW, // Mặc định là thời điểm tạo bản ghi
            allowNull: false,
        },
        // createdAt và updatedAt được tự động quản lý
    }, {
        tableName: 'Attendances',
        timestamps: true
    });

    Attendance.associate = (models) => {
        // Một bản ghi Attendance thuộc về một Class
        Attendance.belongsTo(models.Class, {
            foreignKey: { // Định nghĩa rõ ràng FK
                name: 'classId',
                allowNull: false
            },
            as: 'classInfo' // Alias
        });

        // Một bản ghi Attendance thuộc về một Student
        Attendance.belongsTo(models.Student, {
             foreignKey: { // Định nghĩa rõ ràng FK
                name: 'studentId',
                allowNull: false
            },
            as: 'studentInfo' // Alias
        });
        // Một bản ghi Attendance (có thể) thuộc về một Buổi học cụ thể
        Attendance.belongsTo(models.ClassSchedule, {
            foreignKey: {
               name: 'scheduleId', // Tên cột khóa ngoại sẽ được tạo trong bảng Attendances
               allowNull: true     // Cho phép null. Có thể bạn muốn điểm danh không theo lịch?
                                   // Nếu bắt buộc điểm danh phải theo lịch, đặt là false
                                   // và đảm bảo logic checkIn luôn tìm được schedule
            },
            as: 'scheduleInfo' // Alias để truy cập thông tin buổi học từ điểm danh
       });
    };

    return Attendance;
};