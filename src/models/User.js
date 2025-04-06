'use strict';

const { sequelize, DataTypes, QueryTypes } = require("sequelize");
const { validate } = require("uuid");

module.exports = (sequelize, DataTypes)=>{
    const User = sequelize.define('User', {
        // ID tự động được thêm bởi Sequelize (primary key, auto-increment)
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: {
                args: true,
                msg: 'Username already exists' // Thông báo lỗi nếu trùng
            },
            validate: {
                notNull: { msg: "Username is required" },
                notEmpty: { msg: "Username cannot be empty" }
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notNull: { msg: "Password is required" },
                notEmpty: { msg: "Password cannot be empty" },
                // Thêm validate độ dài tối thiểu cho password
                len: {
                    args: [8, 255],
                    msg: "Mật khẩu tối thiểu 8 ký tự"
                }
            }
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'student', // Mặc định là sinh viên khi tạo mới
            validate: {
                isIn: {
                    args: [['student', 'teacher', 'admin']],
                    msg: "Role must be 'student', 'teacher', or 'admin'"
                }
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true, // Cho phép email là null
            unique: {
                args: true,
                msg: 'Email already exists'
            },
            validate: {
                isEmail: { msg: 'Invalid email format' },
            },
        },
        studentId: { // Lưu trữ mã số sinh viên nếu role là 'student'
            type: DataTypes.STRING,
            allowNull: true, // Chỉ có giá trị khi role='student'
            unique: { // Đảm bảo studentId trên bảng User cũng là duy nhất (nếu có)
                args: true,
                msg: 'Trùng mã sinh viên!'
            },
            // Không cần validate notEmpty ở đây vì nó có thể null
        },
        // createdAt và updatedAt được tự động quản lý bởi timestamps: true
    }, {
        tableName: 'Users', // Tên bảng trong database (có thể bỏ nếu Sequelize tự suy luận đúng)
        timestamps: true // Tự động thêm createdAt và updatedAt
    });

    User.associate = (models) => {
        // Một User có thể là một Student (quan hệ 1-1)
        // Khi xóa User, Student liên quan cũng bị xóa (onDelete: 'CASCADE')
        User.hasOne(models.Student, {
            foreignKey: 'userId', // Khóa ngoại trong bảng Students
            as: 'studentProfile', // Alias để truy cập (vd: user.getStudentProfile())
            onDelete: 'CASCADE'
        });

        // Một User (Teacher) có thể dạy nhiều Class (quan hệ 1-N)
        User.hasMany(models.Class, {
             foreignKey: 'teacherId', // Khóa ngoại trong bảng Classes
             as: 'teachingClasses' // Alias để truy cập (vd: teacher.getTeachingClasses())
             // onDelete mặc định là SET NULL hoặc NO ACTION nếu FK cho phép NULL
        });
    };

    return User;
};