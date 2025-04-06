'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class ClassStudent extends Model {
        static associate(models) {
            // Định nghĩa các mối quan hệ
            ClassStudent.belongsTo(models.Class, {
                foreignKey: 'classId',
                as: 'classInfo'
            });
            ClassStudent.belongsTo(models.Student, {
                foreignKey: 'studentId',
                as: 'studentInfo'
            });
        }
    }

    ClassStudent.init({
        classId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'Classes',
                key: 'id'
            }
        },
        studentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'Students',
                key: 'id'
            }
        }
    }, {
        sequelize,
        modelName: 'ClassStudent',
        tableName: 'ClassStudent',
        timestamps: true
    });

    return ClassStudent;
}; 