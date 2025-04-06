"use strict";
const { sequelize, DataTypes, QueryTypes } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  const ClassSchedule = sequelize.define(
    "ClassSchedule",
    {
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Classes",
          key: "id",
        },
        onDelete: "CASCADE", //xoa lop thi xoa lich hoc luon
      },
      dayOfWeek: {
        // Lưu ngày trong tuần dưới dạng số: 0 = Chủ Nhật, 1 = Thứ Hai, ..., 6 = Thứ Bảy
        // (Theo chuẩn của JavaScript Date.getDay())
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notNull: { msg: "Day of the week is required" },
          isInt: { msg: "Day of the week must be an integer" },
          min: {
            args: [0],
            msg: "Day of the week must be between 0 (Sunday) and 6 (Saturday)",
          },
          max: {
            args: [6],
            msg: "Day of the week must be between 0 (Sunday) and 6 (Saturday)",
          },
        },
      },
      startTime: {
        // Lưu giờ bắt đầu dưới dạng TIME (HH:MM:SS)
        type: DataTypes.TIME,
        allowNull: false,
        validate: {
          notNull: { msg: "Start time is required" },
          // is: /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/ // Validate format HH:MM:SS if needed, TIME type usually handles this
        },
      },
      endTime: {
        // Lưu giờ kết thúc dưới dạng TIME (HH:MM:SS)
        type: DataTypes.TIME,
        allowNull: false,
        validate: {
          notNull: { msg: "End time is required" },
          // Custom validator để đảm bảo endTime > startTime
          isAfterStartTime(value) {
            if (value && this.startTime && value <= this.startTime) {
              throw new Error("End time must be after start time");
            }
          },
        },
      },
      // (Tùy chọn) Thêm các trường khác nếu cần
      // location: { type: DataTypes.STRING },
      // isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    },
    {
      tableName: "ClassSchedules",
      timestamps: true, // Thêm createdAt, updatedAt
    }
  );
  ClassSchedule.associate = (models) => {
    // Một lịch học thuộc về một Class
    ClassSchedule.belongsTo(models.Class, {
      foreignKey: "classId",
      as: "classInfo",
    });
  };

  return ClassSchedule;
};
