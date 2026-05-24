const bcrypt           = require('bcryptjs');
const jwt              = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const StudentAuthModel = require('../models/studentAuthModel');
const MarksModel       = require('../models/marksModel');
const AttendanceModel  = require('../models/attendanceModel');
const path             = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const studentAuthController = {

  // POST /api/student/login
  login: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { email, password } = req.body;

      // 1. Find student account
      const account = await StudentAuthModel.findByEmail(email);
      if (!account) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // 2. Compare password
      const isMatch = await bcrypt.compare(password, account.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // 3. Sign JWT with role = student
      const token = jwt.sign(
        {
          id:         account.id,
          student_id: account.student_id,
          email:      account.email,
          role:       'student'
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        student: {
          id:            account.id,
          student_id:    account.student_id,
          name:          account.name,
          email:         account.email,
          class_name:    account.class_name,
          class_section: account.class_section
        }
      });

    } catch (err) {
      console.error('Student login error:', err);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  },

  // GET /api/student/me
  getMe: async (req, res) => {
    try {
      const account = await StudentAuthModel.findById(req.student.id);
      if (!account) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }
      res.json({ success: true, data: account });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
  },

  // GET /api/student/marks
  getMyMarks: async (req, res) => {
    try {
      // Student can only see their OWN marks
      const marks = await MarksModel.getByStudent(req.student.student_id);
      res.json({ success: true, data: marks });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch marks' });
    }
  },

  // GET /api/student/attendance
  getMyAttendance: async (req, res) => {
    try {
      // Student can only see their OWN attendance
      const records = await AttendanceModel.getByStudent(req.student.student_id);

      // Calculate summary
      const total   = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const absent  = records.filter(r => r.status === 'absent').length;
      const late    = records.filter(r => r.status === 'late').length;
      const percentage = total > 0
        ? Math.round((present / total) * 100) : 0;

      res.json({
        success: true,
        data: records,
        summary: { total, present, absent, late, percentage }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
    }
  },

  // PUT /api/student/change-password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Both passwords are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters'
        });
      }

      // Get full account with hash
      const [[account]] = await require('../config/db').query(
        'SELECT password_hash FROM student_users WHERE id = ?',
        [req.student.id]
      );

      const isMatch = await bcrypt.compare(currentPassword, account.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await StudentAuthModel.updatePassword(req.student.id, newHash);

      res.json({ success: true, message: 'Password changed successfully' });

    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to change password' });
    }
  }

};

module.exports = studentAuthController;