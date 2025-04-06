const express = require("express");
const bodyParser = require("body-parser");
const db = require("./src/models");
const cors = require("cors");
require("dotenv").config();

const authRoute = require("./src/routes/authRoute");
const adminRoute = require("./src/routes/adminRoute");
const attendanceRoute = require("./src/routes/attendanceRoute");
const classRoute = require("./src/routes/classRoute");
const studentRoute = require("./src/routes/studentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000"; // Default fallback for local dev

const allowedOrigins = [
    frontendURL, // URL React app đã deploy (Vercel, Netlify...)
    "http://localhost:3000", // Thêm các cổng local khác nếu cần
    // Có thể thêm các origin khác nếu cần (ví dụ: staging environment)
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        // or from allowed origins
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`); // Log cảnh báo để debug
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // Quan trọng nếu bạn dùng cookies/sessions/tokens trong header Authorization
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
//Middleware

app.use(bodyParser.json());

//routes
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);
app.use("/api/attendance", attendanceRoute);
app.use("/api/classes", classRoute);
app.use("/api/students", studentRoute);

// Middleware xử lý lỗi tập trung (đặt cuối cùng)
app.use((err, req, res, next) => {
  console.error("-------------------- ERROR --------------------");
  console.error("Timestamp:", new Date().toISOString());
  console.error("Route:", req.method, req.originalUrl);
  console.error("Request Body:", req.body);
  console.error("Error Stack:", err.stack);
  console.error("---------------------------------------------");

  // Không gửi stack trace chi tiết cho client trong môi trường production
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal Server Error"
      : err.message || "Something went wrong!";

  res.status(statusCode).json({ error: message });
});

// Sync database and start server
// db.sequelize
//   .sync()
//   .then(() => {
//     console.log("Database synced successfully.");
//     app.listen(PORT, () => {
//       console.log(`Server running on http://localhost:${PORT}`);
      
//     });
//   })
//   .catch((err) => {
//     console.error("Unable to sync database:", err);
//     process.exit(1); // Thoát nếu không kết nối được DB
//   });
console.log("Attempting to connect to the database...");
db.sequelize.authenticate() // Chỉ kiểm tra kết nối, không thay đổi schema
  .then(() => {
    console.log('Database connection has been established successfully.');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Accepting requests from: ${allowedOrigins.join(', ')}`); // Log lại cấu hình CORS
      // Log các routes nếu cần
      // console.log('Available routes: ...');
    });
  })
  .catch(err => {
    console.error('!!! Unable to connect to the database:', err);
    process.exit(1); // Thoát nếu không kết nối được DB
  });
