const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const admin = require('../controllers/adminController');

// Routes đăng nhập
router.post('/teacher/login', authController.login);
router.post('/student/login', authController.login);
router.post('/admin/login', admin.adminLogin);

module.exports = router;