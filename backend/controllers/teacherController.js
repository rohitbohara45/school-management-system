const { validationResult } = require('express-validator');
const TeacherModel = require('../models/teacherModel');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const teacherController = {

  getAll: async (req, res) => {
    try {
      const teachers = await TeacherModel.getAll();
      res.json({ success: true, count: teachers.length, data: teachers });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch teachers' });
    }
  },

  getOne: async (req, res) => {
    try {
      const teacher = await TeacherModel.getById(req.params.id);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
      res.json({ success: true, data: teacher });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch teacher' });
    }
  },

  create: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { name, email, phone, subject } = req.body;

      if (email) {
        const taken = await TeacherModel.emailExists(email);
        if (taken) {
          return res.status(409).json({
            success: false,
            message: 'Email already in use'
          });
        }
      }

      const newId = await TeacherModel.create({ name, email, phone, subject });

      // Auto-create teacher login if email provided
      if (email) {
        await autoCreateTeacherLogin(newId, email, name);
      }

      const newTeacher = await TeacherModel.getById(newId);
      res.status(201).json({
        success: true,
        message: email
          ? 'Teacher created with login account. Default password: teacher123'
          : 'Teacher created. Add an email to enable login.',
        data: newTeacher
      });

    } catch (err) {
      console.error('create teacher error:', err);
      res.status(500).json({ success: false, message: 'Failed to create teacher' });
    }
  },

  update: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { id } = req.params;

      const existing = await TeacherModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }

      const { name, email, phone, subject } = req.body;

      if (email) {
        const taken = await TeacherModel.emailExists(email, id);
        if (taken) {
          return res.status(409).json({
            success: false,
            message: 'Email already in use'
          });
        }
      }

      await TeacherModel.update(id, { name, email, phone, subject });

      // Update login if email changed or added
      if (email && email !== existing.email) {
        await autoUpdateTeacherLogin(id, email, name);
      } else if (email && !existing.email) {
        await autoCreateTeacherLogin(id, email, name);
      }

      const updated = await TeacherModel.getById(id);
      res.json({
        success: true,
        message: 'Teacher updated successfully',
        data: updated
      });

    } catch (err) {
      console.error('update teacher error:', err);
      res.status(500).json({ success: false, message: 'Failed to update teacher' });
    }
  },

  delete: async (req, res) => {
    try {
      const existing = await TeacherModel.getById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
      await TeacherModel.delete(req.params.id);
      res.json({
        success: true,
        message: 'Teacher and login account deleted'
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to delete teacher' });
    }
  }

};

// ── Auto-create teacher login ─────────────────────────────────
async function autoCreateTeacherLogin(teacherId, email, name) {
  try {
    const [existing] = await db.query(
      'SELECT id FROM teacher_users WHERE teacher_id = ?',
      [teacherId]
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE teacher_users SET email = ? WHERE teacher_id = ?',
        [email, teacherId]
      );
      console.log(`Updated login email for teacher: ${name}`);
      return;
    }

    // Default password is: teacher123
    const hash = await bcrypt.hash('teacher123', 10);
    await db.query(
      `INSERT INTO teacher_users (teacher_id, email, password_hash)
       VALUES (?, ?, ?)`,
      [teacherId, email, hash]
    );

    console.log(`✅ Login auto-created for teacher: ${name} | Email: ${email} | Password: teacher123`);

  } catch (err) {
    console.error('Auto-create teacher login failed:', err.message);
  }
}

// ── Auto-update teacher login when email changes ──────────────
async function autoUpdateTeacherLogin(teacherId, newEmail, name) {
  try {
    const [existing] = await db.query(
      'SELECT id FROM teacher_users WHERE teacher_id = ?',
      [teacherId]
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE teacher_users SET email = ? WHERE teacher_id = ?',
        [newEmail, teacherId]
      );
      console.log(`✅ Login email updated for teacher: ${name}`);
    } else {
      await autoCreateTeacherLogin(teacherId, newEmail, name);
    }
  } catch (err) {
    console.error('Auto-update teacher login failed:', err.message);
  }
}

module.exports = teacherController;