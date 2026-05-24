const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

function protectStudent(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'student') {
            return res.status(403).json({ success: false, message: 'Student account required.' });
        }
        req.student = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    console.log('\n--- Student login attempt ---');
    console.log('Email:', cleanEmail);

    // Get account
    const [rows] = await db.query(
      `SELECT
         su.id,
         su.student_id,
         su.email,
         su.password_hash,
         su.is_active,
         s.name,
         s.class_id,
         c.name    AS class_name,
         c.section AS class_section
       FROM student_users su
       JOIN students s ON su.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE LOWER(su.email) = ? AND su.is_active = 1`,
      [cleanEmail]
    );

    console.log('Accounts found:', rows.length);

    if (!rows.length) {
      console.log('No account found');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const account = rows[0];
    console.log('Found:', account.name);
    console.log('Hash length:', account.password_hash.length);

    const isMatch = await bcrypt.compare(password, account.password_hash);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

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

    console.log('✅ Login successful for:', account.name);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      student: {
        id:            account.id,
        student_id:    account.student_id,
        name:          account.name,
        email:         account.email,
        class_id:      account.class_id,
        class_name:    account.class_name,
        class_section: account.class_section
      }
    });

  } catch (err) {
    console.error('Student login error:', err);
    res.status(500).json({
      success: false,
      message: 'Login failed: ' + err.message
    });
  }
});

router.get('/me', protectStudent, async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT su.id, su.student_id, su.email,
             s.name, s.phone, s.dob,
             c.name AS class_name, c.section AS class_section
      FROM student_users su
      JOIN students s ON su.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE su.id = ?
    `, [req.student.id]);
        if (!rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed: ' + err.message });
    }
});

router.get('/marks', protectStudent, async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT m.*,
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
      WHERE m.student_id = ?
      ORDER BY m.term, m.subject
    `, [req.student.student_id]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed: ' + err.message });
    }
});

router.get('/attendance', protectStudent, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM attendance WHERE student_id = ? ORDER BY att_date DESC LIMIT 30',
            [req.student.student_id]
        );
        const total = rows.length;
        const present = rows.filter(r => r.status === 'present').length;
        const absent = rows.filter(r => r.status === 'absent').length;
        const late = rows.filter(r => r.status === 'late').length;
        res.json({
            success: true,
            data: rows,
            summary: {
                total, present, absent, late,
                percentage: total > 0 ? Math.round((present / total) * 100) : 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed: ' + err.message });
    }
});

router.put('/change-password', protectStudent, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Invalid input' });
        }
        const [[account]] = await db.query(
            'SELECT password_hash FROM student_users WHERE id = ?', [req.student.id]
        );
        const isMatch = await bcrypt.compare(currentPassword, account.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }
        const newHash = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE student_users SET password_hash = ? WHERE id = ?', [newHash, req.student.id]);
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed: ' + err.message });
    }
});
// POST /api/student/forgot-password
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

    // Find student account
    const [rows] = await db.query(
      'SELECT id FROM student_users WHERE email = ?',
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
      'UPDATE student_users SET password_hash = ? WHERE email = ?',
      [newHash, email.trim()]
    );

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    });

  } catch (err) {
    console.error('Student reset error:', err);
    res.status(500).json({
      success: false,
      message: 'Reset failed: ' + err.message
    });
  }
});

module.exports = router;