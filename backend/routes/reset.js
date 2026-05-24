const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db             = require('../config/db');
const { sendMail }   = require('../config/mailer');

// ── Generate 6-digit code ─────────────────────────────────────
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Email HTML template ───────────────────────────────────────
function getEmailHTML(code, role, name) {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f0f2f5;padding:24px;margin:0;">
      <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">

        <div style="background:#1e2a3a;padding:24px 32px;">
          <h1 style="color:#fff;font-size:20px;margin:0;">SchoolMS</h1>
          <p style="color:#94a3b8;font-size:13px;margin:4px 0 0;">
            ${roleLabel} Password Reset
          </p>
        </div>

        <div style="padding:32px;">
          <p style="font-size:15px;color:#1e2a3a;margin:0 0 8px;">
            Hello ${name || 'there'},
          </p>
          <p style="font-size:14px;color:#64748b;margin:0 0 24px;line-height:1.6;">
            Use the code below to reset your password.
            This code expires in <strong>10 minutes</strong>.
          </p>

          <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;
                      padding:24px;text-align:center;margin-bottom:24px;">
            <p style="font-size:12px;color:#64748b;margin:0 0 8px;
                      text-transform:uppercase;letter-spacing:1px;">
              Your reset code
            </p>
            <div style="font-size:48px;font-weight:800;letter-spacing:14px;
                        color:#2563eb;font-family:monospace;">
              ${code}
            </div>
            <p style="font-size:12px;color:#94a3b8;margin:8px 0 0;">
              Expires in 10 minutes
            </p>
          </div>

          <p style="font-size:13px;color:#94a3b8;margin:0;">
            If you did not request this, ignore this email.
          </p>
        </div>

        <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;
                    text-align:center;">
          <p style="font-size:11px;color:#94a3b8;margin:0;">SchoolMS — School Management System</p>
        </div>

      </div>
    </body>
    </html>
  `;
}

// ── Find account by email and role ────────────────────────────
async function findAccount(email, role) {
  let query;
  if (role === 'admin') {
    query = 'SELECT id, name, email FROM admins WHERE email = ?';
  } else if (role === 'teacher') {
    query = `
      SELECT tu.id, t.name, tu.email
      FROM teacher_users tu
      JOIN teachers t ON tu.teacher_id = t.id
      WHERE tu.email = ?
    `;
  } else if (role === 'student') {
    query = `
      SELECT su.id, s.name, su.email
      FROM student_users su
      JOIN students s ON su.student_id = s.id
      WHERE su.email = ?
    `;
  } else {
    return null;
  }
  const [rows] = await db.query(query, [email]);
  return rows[0] || null;
}

// ── Update password in correct table ─────────────────────────
async function updatePassword(email, role, newHash) {
  if (role === 'admin') {
    await db.query(
      'UPDATE admins SET password_hash = ? WHERE email = ?',
      [newHash, email]
    );
  } else if (role === 'teacher') {
    await db.query(
      'UPDATE teacher_users SET password_hash = ? WHERE email = ?',
      [newHash, email]
    );
  } else if (role === 'student') {
    await db.query(
      'UPDATE student_users SET password_hash = ? WHERE email = ?',
      [newHash, email]
    );
  }
}

// ── POST /api/reset/send-code ─────────────────────────────────
router.post('/send-code', async (req, res) => {
  try {
    const { email, role } = req.body;

    console.log('Send code request:', { email, role });

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required'
      });
    }

    if (!['admin', 'teacher', 'student'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, teacher or student.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find account
    const account = await findAccount(cleanEmail, role);
    console.log('Account found:', account ? 'YES - ' + account.name : 'NO');

    if (!account) {
      // Return success anyway — security best practice
      return res.json({
        success: true,
        message: 'If that email exists, a reset code has been sent.'
      });
    }

    // Delete old codes for this email
    await db.query(
      'DELETE FROM password_resets WHERE email = ? AND role = ?',
      [cleanEmail, role]
    );

    // Generate code and expiry
    const code      = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log('Generated code:', code, 'for', cleanEmail);

    // Save to DB
    await db.query(
      'INSERT INTO password_resets (email, code, role, expires_at) VALUES (?, ?, ?, ?)',
      [cleanEmail, code, role, expiresAt]
    );

    // Send email
    console.log('Sending email to:', account.email);
    await sendMail({
      to:      account.email,
      subject: `${code} is your SchoolMS password reset code`,
      html:    getEmailHTML(code, role, account.name)
    });

    console.log('✅ Code sent to:', account.email);

    res.json({
      success: true,
      message: 'Reset code sent to your email. Check your inbox.'
    });

  } catch (err) {
    console.error('❌ send-code error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send code: ' + err.message
    });
  }
});

// ── POST /api/reset/verify-code ───────────────────────────────
router.post('/verify-code', async (req, res) => {
  try {
    const { email, role, code, newPassword } = req.body;

    console.log('Verify code request:', { email, role, code });

    if (!email || !role || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find reset record
    const [rows] = await db.query(
      `SELECT * FROM password_resets
       WHERE email = ? AND role = ? AND used = 0
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, role]
    );

    const record = rows[0];
    console.log('Reset record found:', record ? 'YES' : 'NO');

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No reset code found. Please request a new one.'
      });
    }

    // Check expiry
    if (new Date() > new Date(record.expires_at)) {
      await db.query('DELETE FROM password_resets WHERE id = ?', [record.id]);
      return res.status(400).json({
        success: false,
        message: 'Code has expired. Please request a new one.'
      });
    }

    // Check code
    console.log('Code in DB:', record.code, '| Code entered:', code.trim());
    if (record.code !== code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect code. Please try again.'
      });
    }

    // Just a code check — no password update yet
    if (newPassword === 'TEMP_CHECK_ONLY_PLACEHOLDER_123') {
      return res.json({
        success: true,
        message: 'Code verified. Please set your new password.'
      });
    }

    // Validate password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Mark as used
    await db.query(
      'UPDATE password_resets SET used = 1 WHERE id = ?',
      [record.id]
    );

    // Update password
    const newHash = await bcrypt.hash(newPassword, 10);
    await updatePassword(cleanEmail, role, newHash);

    // Clean up
    await db.query(
      'DELETE FROM password_resets WHERE email = ? AND role = ?',
      [cleanEmail, role]
    );

    console.log('✅ Password reset for:', cleanEmail);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    });

  } catch (err) {
    console.error('❌ verify-code error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed: ' + err.message
    });
  }
});

module.exports = router;