// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// @route   POST /api/admin/users
// @desc    Create a new user (student, teacher, or admin)
// @access  Private (Admin only)
router.post(
  "/api/users",
  protect,
  restrictTo("admin"),
  adminController.createUser
);
router.get(
  "/api/teachers",
  protect,
  restrictTo("admin"),
  adminController.getTeachers
);

router
  .route("/api/teachers/:id")
  .put(protect, restrictTo("admin"), adminController.updateTeacher)
  .delete(protect, restrictTo("admin"), adminController.deleteTeacher);
module.exports = router;
