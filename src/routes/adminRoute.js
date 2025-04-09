// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// @route   POST /api/admin/users
// @desc    Create a new user (student, teacher, or admin)
// @access  Private (Admin only)
router.post(
  "/users",
  protect,
  restrictTo("admin"),
  adminController.createUser
);

// @route   GET /api/admin/teachers
// @desc    Get all teachers
// @access  Private (Admin only)
router.get(
  "/teachers",
  protect,
  restrictTo("admin"),
  adminController.getTeachers
);

// @route   PUT /api/admin/teachers/:id
// @desc    Update a teacher
// @access  Private (Admin only)
// @route   DELETE /api/admin/teachers/:id
// @desc    Delete a teacher
// @access  Private (Admin only)
router.route("/teachers/:id")
    .put(protect, restrictTo("admin"), adminController.updateTeacher)
    .delete(protect, restrictTo("admin"), adminController.deleteTeacher);

module.exports = router;
