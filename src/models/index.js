// models/index.js
'use strict';

const fs = require('fs'); // Module xử lý file hệ thống của Node.js
const path = require('path'); // Module xử lý đường dẫn file của Node.js
const { Sequelize, DataTypes } = require('sequelize'); // Import Sequelize và DataTypes
require('dotenv').config(); // Load các biến môi trường từ file .env

const basename = path.basename(__filename); // Tên của file hiện tại (index.js)
const env = process.env.NODE_ENV || 'development'; // Xác định môi trường (mặc định là development)

// 1. Khởi tạo Sequelize Instance trước
const sequelize = new Sequelize(
    process.env.DB_NAME,      // Tên database
    process.env.DB_USER,      // Username database
    process.env.DB_PASSWORD,  // Password database
    {
        host: process.env.DB_HOST,    // Host database
        port: process.env.DB_PORT || 3306, // Cổng database (mặc định 3306 nếu không có trong .env)
        dialect: 'mysql',             // Loại database đang sử dụng
        dialectOptions: {
      ssl: {
        require: true, // bắt buộc với Aiven
        rejectUnauthorized: false // bỏ qua kiểm tra chứng chỉ
      }
    },
        logging: env === 'development' ? console.log : false, // Bật logging SQL khi ở môi trường development
        // (Tùy chọn) Thêm các cấu hình khác cho Sequelize nếu cần
        // pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
        // dialectOptions: { // Ví dụ cho MySQL
        //     // ssl: {
        //     //     require: true,
        //     //     rejectUnauthorized: false // Có thể cần nếu dùng SSL mà không có CA hợp lệ
        //     // }
        // },
    }
);

// Kiểm tra kết nối database (tùy chọn nhưng hữu ích)
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    // Có thể thoát ứng dụng nếu không kết nối được DB
    // process.exit(1);
  });

// 2. Sau đó mới khởi tạo đối tượng db và import các models
const db = {};

// 3. Import các models
db.User = require('./User')(sequelize, DataTypes);
db.Class = require('./Class')(sequelize, DataTypes);
db.Student = require('./Student')(sequelize, DataTypes);
db.Attendance = require('./Attendance')(sequelize, DataTypes);
db.ClassSchedule = require('./ClassSchedule')(sequelize, DataTypes);
db.ClassStudent = require('./ClassStudent')(sequelize, DataTypes);

// 4. Đọc và Import tất cả các file Model trong thư mục hiện tại
fs
  .readdirSync(__dirname) // Đọc tất cả các file trong thư mục 'models' (__dirname)
  .filter(file => {
    // Lọc ra các file JavaScript (.js), không phải file ẩn, không phải file index.js này, và không phải file test
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    // Import model từ file
    // Hàm require(path.join(__dirname, file)) trả về hàm (sequelize, DataTypes) => { ... } đã export từ file model
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    // Gắn model vào đối tượng db với tên là tên của model (ví dụ: db['User'] = User)
    db[model.name] = model;
  });

// 5. Thiết lập Associations (Mối quan hệ) giữa các Models
Object.keys(db).forEach(modelName => {
  // Kiểm tra xem model có định nghĩa phương thức 'associate' không
  if (db[modelName].associate) {
    // Gọi phương thức 'associate', truyền vào toàn bộ đối tượng db (chứa tất cả các model)
    db[modelName].associate(db);
  }
});

// 6. Gắn instance sequelize và Sequelize constructor vào đối tượng db
// Giúp dễ dàng truy cập từ các phần khác của ứng dụng nếu cần
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// 7. Export đối tượng db
module.exports = db; // Export db để sử dụng trong các controllers và server.js
