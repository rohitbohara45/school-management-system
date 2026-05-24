const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

// ── Auth middleware ───────────────────────────────────────────
function protectTeacher(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please log in.'
      });
    }
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Teacher account required.'
      });
    }
    req.teacher = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid token.'
    });
  }
}

// ── POST /api/teacher/login ───────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    // Get teacher account with teacher profile info
    const [rows] = await db.query(`
      SELECT
        tu.*,
        t.name,
        t.subject
      FROM teacher_users tu
      JOIN teachers t ON tu.teacher_id = t.id
      WHERE tu.email = ? AND tu.is_active = 1
    `, [email]);

    const account = rows[0];
    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, account.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      {
        id:         account.id,
        teacher_id: account.teacher_id,
        email:      account.email,
        role:       'teacher'
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      teacher: {
        id:         account.id,
        teacher_id: account.teacher_id,
        name:       account.name,
        email:      account.email,
        subject:    account.subject
      }
    });

  } catch (err) {
    console.error('Teacher login error:', err);
    res.status(500).json({
      success: false,
      message: 'Login failed: ' + err.message
    });
  }
});

// ── GET /api/teacher/me ───────────────────────────────────────
router.get('/me', protectTeacher, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        tu.id, tu.teacher_id, tu.email,
        t.name, t.phone, t.subject
      FROM teacher_users tu
      JOIN teachers t ON tu.teacher_id = t.id
      WHERE tu.id = ?
    `, [req.teacher.id]);

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed: ' + err.message
    });
  }
});

// ── GET /api/teacher/classes ──────────────────────────────────
// Only returns classes assigned to THIS teacher
router.get('/classes', protectTeacher, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.*,
        COUNT(s.id) AS student_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id
      WHERE c.teacher_id = ?
      GROUP BY c.id
      ORDER BY c.name, c.section
    `, [req.teacher.teacher_id]);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed: ' + err.message
    });
  }
});

// ── GET /api/teacher/classes/:classId/students ────────────────
// Only returns students in teacher's own class
router.get('/classes/:classId/students', protectTeacher, async (req, res) => {
  try {
    // Verify this class belongs to the teacher
    const [classCheck] = await db.query(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ?',
      [req.params.classId, req.teacher.teacher_id]
    );

    if (!classCheck[0]) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class.'
      });
    }

    const [rows] = await db.query(`
      SELECT
        s.id, s.name, s.email, s.phone, s.dob
      FROM students s
      WHERE s.class_id = ?
      ORDER BY s.name
    `, [req.params.classId]);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed: ' + err.message
    });
  }
});

// ── GET /api/teacher/attendance ───────────────────────────────
// Get attendance for a date, filtered to teacher's classes only
router.get('/attendance', protectTeacher, async (req, res) => {
  try {
    const date    = req.query.date || new Date().toISOString().split('T')[0];
    const classId = req.query.class_id;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'class_id is required'
      });
    }

    // Security check — teacher can only view their own classes
    const [classCheck] = await db.query(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ?',
      [classId, req.teacher.teacher_id]
    );

    if (!classCheck[0]) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class.'
      });
    }

    // Get all students in class with their attendance for the date
    const [rows] = await db.query(`
      SELECT
        s.id AS student_id,
        s.name AS student_name,
        COALESCE(a.status, 'present') AS status,
        a.id AS attendance_id
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id AND a.att_date = ?
      WHERE s.class_id = ?
      ORDER BY s.name
    `, [date, classId]);

    res.json({ success: true, data: rows, date });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed: ' + err.message
    });
  }
});

// ── POST /api/teacher/attendance ──────────────────────────────
// Teacher marks attendance — only for their own classes
router.post('/attendance', protectTeacher, async (req, res) => {
  try {
    const { date, class_id, records } = req.body;

    if (!date || !class_id || !records || !records.length) {
      return res.status(400).json({
        success: false,
        message: 'date, class_id and records are required'
      });
    }

    // Security check
    const [classCheck] = await db.query(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ?',
      [class_id, req.teacher.teacher_id]
    );

    if (!classCheck[0]) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class.'
      });
    }

    // Bulk upsert
    for (const r of records) {
      await db.query(`
        INSERT INTO attendance (student_id, att_date, status)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status)
      `, [r.student_id, date, r.status]);
    }

    res.json({
      success: true,
      message: `Attendance saved for ${records.length} students`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed: ' + err.message
    });
  }
});

// ── GET /api/teacher/marks ────────────────────────────────────
// View marks for students in teacher's classes only
router.get('/marks', protectTeacher, async (req, res) => {
  try {
    const { class_id, term } = req.query;

    if (!class_id) {
      return res.status(400).json({
        success: false,
        message: 'class_id is required'
      });
    }

    // Security check
    const [classCheck] = await db.query(
      'SELECT id FROM classes WHERE id = ? AND teacher_id = ?',
      [class_id, req.teacher.teacher_id]
    );

    if (!classCheck[0]) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class.'
      });
    }

    let query = `
      SELECT
        m.*,
        s.name AS student_name,
        ROUND((m.marks_obtained / m.total_marks) * 100, 1) AS percentage,
        CASE
          WHEN (m.marks_obtained / m.total_marks) >= 0.90 THEN 'A+'
          WHEN (m.marks_obtained / m.total_marks) >= 0.80 THEN 'A'
          WHEN (m.marks_obtained / m.total_marks) >= 0.70 THEN 'B'
          WHEN (m.marks_obtained / m.total_marks) >= 0.60 THEN 'C'
          WHEN (m.marks_obtained / m.total_marks) >= 0.50 THEN 'D'
          ELSE 'F'
        END AS grade
      FROM marks m
      JOIN students s ON m.student_id = s.id
      WHERE s.class_id = ?
    `;
    const params = [class_id];

    if (term) {
      query += ' AND m.term = ?';
      params.push(term);
    }

    query += ' ORDER BY s.name, m.subject';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed: ' + err.message
    });
  }
});

// ── PUT /api/teacher/change-password ─────────────────────────
router.put('/change-password', protectTeacher, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input'
      });
    }

    const [[account]] = await db.query(
      'SELECT password_hash FROM teacher_users WHERE id = ?',
      [req.teacher.id]
    );

    const isMatch = await bcrypt.compare(currentPassword, account.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE teacher_users SET password_hash = ? WHERE id = ?',
      [newHash, req.teacher.id]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed: ' + err.message
    });
  }
});
// POST /api/teacher/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, resetKey, newPassword } = req.body;

    if (!email || !resetKey || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset key and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Verify reset key
    if (resetKey.trim() !== (process.env.RESET_SECRET || '').trim()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid reset key'
      });
    }

    // Find teacher account
    const [rows] = await db.query(
      'SELECT id FROM teacher_users WHERE email = ?',
      [email.trim()]
    );

    if (!rows[0]) {
      return res.status(401).json({
        success: false,
        message: 'Invalid reset key'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE teacher_users SET password_hash = ? WHERE email = ?',
      [newHash, email.trim()]
    );

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    });

  } catch (err) {
    console.error('Teacher reset error:', err);
    res.status(500).json({
      success: false,
      message: 'Reset failed: ' + err.message
    });
  }
});

module.exports = router;