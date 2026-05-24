const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const AuthModel = require('../models/authModel');

// Force dotenv to load from the correct path
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const authController = {

  // POST /api/auth/login
  login: async (req, res) => {
    // Check validation errors
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

      // 1. Find admin by email
      const admin = await AuthModel.findByEmail(email);
      if (!admin) {
        // Use same message for both wrong email/password
        // (prevents attackers from knowing which one is wrong)
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // 2. Compare password with stored hash
      const isMatch = await bcrypt.compare(password, admin.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // 3. Sign a JWT token
      const token = jwt.sign(
        {
          id:    admin.id,
          email: admin.email,
          role:  'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }  // Token expires in 8 hours
      );

      // 4. Send token + admin info back (never send password_hash)
      res.json({
        success: true,
        message: 'Login successful',
        token,
        admin: {
          id:    admin.id,
          name:  admin.name,
          email: admin.email
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  },

  // GET /api/auth/me  (get logged-in admin profile)
  getMe: async (req, res) => {
    try {
      // req.admin is set by the auth middleware
      const admin = await AuthModel.findById(req.admin.id);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }
      res.json({ success: true, data: admin });
    } catch (error) {
      console.error('getMe error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
  },

  // POST /api/auth/logout  (frontend just deletes the token)
  logout: (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
  },
  // PUT /api/auth/change-password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters'
        });
      }

      // Load admin from DB using ID from JWT token
      const admin = await AuthModel.findById(req.admin.id);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }

      // We need the password_hash so fetch it directly
      const db = require('../config/db');
      const [[fullAdmin]] = await db.query(
        'SELECT password_hash FROM admins WHERE id = ?', [req.admin.id]
      );

      // Verify current password is correct
      const isMatch = await bcrypt.compare(currentPassword, fullAdmin.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password and save
      const newHash = await bcrypt.hash(newPassword, 10);
      await db.query(
        'UPDATE admins SET password_hash = ? WHERE id = ?',
        [newHash, req.admin.id]
      );

      res.json({ success: true, message: 'Password changed successfully' });

    } catch (error) {
      console.error('changePassword error:', error);
      res.status(500).json({ success: false, message: 'Failed to change password' });
    }
  },

  // POST /api/auth/reset-password
  resetPassword: async (req, res) => {
  // Check validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { email, resetKey, newPassword } = req.body;

    // ADD THESE 3 LINES
    console.log('Key received :', JSON.stringify(resetKey));
    console.log('Key in .env  :', JSON.stringify(process.env.RESET_SECRET));
    console.log('Match        :', resetKey.trim() === (process.env.RESET_SECRET || '').trim());

    // Also change the comparison to use .trim() on both sides
    if (resetKey.trim() !== (process.env.RESET_SECRET || '').trim()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid reset key'
      });
    }

    // 2. Check admin exists
    const admin = await AuthModel.findByEmail(email);
    if (!admin) {
      // Same message for wrong email — don't reveal which emails exist
      return res.status(401).json({
        success: false,
        message: 'Invalid reset key'
      });
    }

    // 3. Hash new password and save
    const newHash = await bcrypt.hash(newPassword, 10);
    const db = require('../config/db');
    await db.query(
      'UPDATE admins SET password_hash = ? WHERE email = ?',
      [newHash, email]
    );

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    });

  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ success: false, message: 'Reset failed' });
  }
}

};

module.exports = authController;