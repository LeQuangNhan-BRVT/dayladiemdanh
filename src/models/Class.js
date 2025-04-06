// models/Class.js
"use strict";
module.exports = (sequelize, DataTypes) => {
  const Class = sequelize.define(
    "Class",
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: { msg: "Class name is required" },
          notEmpty: { msg: "Class name cannot be empty" },
        },
      },
      teacherId: {
        // Khóa ngoại liên kết đến giáo viên (User có role='teacher')
        type: DataTypes.INTEGER,
        allowNull: true, // Cho phép lớp chưa có giáo viên
        references: {
          model: "Users", // Tên bảng Users
          key: "id",
        },
        // onDelete: 'SET NULL' // Nếu xóa User(Teacher), teacherId trong Class sẽ thành NULL
        // hoặc để mặc định (phụ thuộc vào cài đặt DB và FK constraint)
      },
    },
    {
      tableName: "Classes",
      timestamps: true,
    }
  );

  Class.associate = (models) => {
    // Một Class thuộc về một User (Teacher)
    Class.belongsTo(models.User, {
      foreignKey: "teacherId",
      as: "Teacher",
    });

    // Một Class có nhiều bản ghi Attendance
    Class.hasMany(models.Attendance, {
      foreignKey: "classId",
      as: "attendances",
      onDelete: "CASCADE",
    });

    // Một Class có nhiều Student (quan hệ N-N)
    Class.belongsToMany(models.Student, {
      through: "ClassStudent",
      foreignKey: "classId",
      otherKey: "studentId",
      as: "Students",
    });

    
    // Một Class có thể có nhiều Lịch học (Buổi học)
    Class.hasMany(models.ClassSchedule, {
      foreignKey: "classId",
      as: "schedules", // Alias để truy cập: class.getSchedules()
      onDelete: "CASCADE", // Xóa lớp thì xóa luôn lịch học
    });
  };

  return Class;
};
