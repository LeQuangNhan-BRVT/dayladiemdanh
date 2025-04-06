// models/Student.js
'use strict';
module.exports = (sequelize, DataTypes) => {
    const Student = sequelize.define('Student', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: { msg: 'Student name is required' },
                notEmpty: { msg: "Student name cannot be empty" }
            }
        },
        studentId: { // Mã số sinh viên, định danh chính của sinh viên
            type: DataTypes.STRING,
            allowNull: false,
            unique: {
                args: true,
                msg: 'Student ID already exists'
            },
            validate: {
                notNull: { msg: 'Student ID is required' },
                notEmpty: { msg: "Student ID cannot be empty" }
            }
        },
        email: { // Email sinh viên, có thể đồng bộ với User.email
            type: DataTypes.STRING,
            allowNull: true,
            unique: {
                args: true,
                msg: 'Email already associated with another student'
            },
            validate: {
                isEmail: { msg: 'Invalid email format' },
            },
        },
        userId: { // Khóa ngoại bắt buộc liên kết đến User tương ứng
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: { // Đảm bảo mỗi User chỉ liên kết với một Student
                args: true,
                msg: 'User account already linked to a student profile'
            },
            references: {
                model: 'Users',
                key: 'id',
            },
            onDelete: 'CASCADE', // Nếu xóa User, xóa luôn Student profile
            onUpdate: 'CASCADE',
        }
    }, {
        tableName: 'Students',
        timestamps: true
    });

    Student.associate = (models) => {
        // Một Student thuộc về một User
        Student.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'userAccount' // Alias để truy cập (vd: student.getUserAccount())
        });

        // Một Student có nhiều bản ghi Attendance
        Student.hasMany(models.Attendance, {
            foreignKey: 'studentId',
            as: 'attendances',
            onDelete: 'CASCADE' // Xóa student thì xóa luôn điểm danh
        });

        // Một Student thuộc về nhiều Class (quan hệ N-N)
        Student.belongsToMany(models.Class, {
            through: 'ClassStudent',
            foreignKey: 'studentId',
            otherKey: 'classId',
            as: 'classes' // Định nghĩa alias
        });
    };

    return Student;
};