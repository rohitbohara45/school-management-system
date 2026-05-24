const { validationResult } = require('express-validator');
const StudentModel = require('../models/studentModel');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const path = require('path');
const fs = require('fs');

const studentController = {

  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const result = await StudentModel.getAll({ page, limit, search });
      res.json({
        success: true,
        count: result.data.length,
        pagination: result.pagination,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch students' });
    }
  },

  getOne: async (req, res) => {
    try {
      const student = await StudentModel.getById(req.params.id);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      res.json({ success: true, data: student });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch student' });
    }
  },

  getProfile: async (req, res) => {
    try {
      const profile = await StudentModel.getFullProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }
      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('getProfile error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
  },

  create: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false, message: 'Validation failed', errors: errors.array()
      });
    }
    try {
      const {
        name, email, phone, dob, class_id,
        parent_name, address, admission_date, academic_year
      } = req.body;

      if (email) {
        const taken = await StudentModel.emailExists(email);
        if (taken) {
          return res.status(409).json({
            success: false, message: 'A student with this email already exists'
          });
        }
      }

      const newId = await StudentModel.create({
        name, email, phone, dob, class_id,
        parent_name, address, admission_date, academic_year
      });

      if (email) {
        await autoCreateStudentLogin(newId, email, name);
      }

      const newStudent = await StudentModel.getById(newId);
      res.status(201).json({
        success: true,
        message: email
          ? 'Student created. Default login password: student123'
          : 'Student created. Add an email to enable login.',
        data: newStudent
      });
    } catch (error) {
      console.error('create student error:', error);
      res.status(500).json({ success: false, message: 'Failed to create student' });
    }
  },

  update: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false, message: 'Validation failed', errors: errors.array()
      });
    }
    try {
      const { id } = req.params;
      const existing = await StudentModel.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      const {
        name, email, phone, dob, class_id,
        parent_name, address, admission_date
      } = req.body;

      if (email) {
        const taken = await StudentModel.emailExists(email, id);
        if (taken) {
          return res.status(409).json({
            success: false, message: 'A student with this email already exists'
          });
        }
      }

      await StudentModel.update(id, {
        name, email, phone, dob, class_id,
        parent_name, address, admission_date
      });

      if (email && email !== existing.email) {
        await autoUpdateStudentLogin(id, email, name);
      } else if (email && !existing.email) {
        await autoCreateStudentLogin(id, email, name);
      }

      const updated = await StudentModel.getById(id);
      res.json({ success: true, message: 'Student updated', data: updated });
    } catch (error) {
      console.error('update student error:', error);
      res.status(500).json({ success: false, message: 'Failed to update student' });
    }
  },

  uploadPhoto: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false, message: 'No file uploaded'
        });
      }

      const student = await StudentModel.getById(req.params.id);
      if (!student) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      // Delete old photo if exists
      if (student.photo_url) {
        const oldPath = path.join(__dirname, '../uploads/students',
          path.basename(student.photo_url));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const photoUrl = `/uploads/students/${req.file.filename}`;
      await StudentModel.updatePhoto(req.params.id, photoUrl);

      res.json({
        success: true,
        message: 'Photo uploaded',
        photo_url: photoUrl
      });
    } catch (error) {
      console.error('uploadPhoto error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload photo' });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await StudentModel.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      // Delete photo file if exists
      if (existing.photo_url) {
        const photoPath = path.join(__dirname, '../uploads/students',
          path.basename(existing.photo_url));
        if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
      }

      await StudentModel.delete(id);
      res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
      console.error('delete student error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete student' });
    }
  }
};

// ── Auto-create student login ────────────────────────────────
async function autoCreateStudentLogin(studentId, email, name) {
  try {
    const [existing] = await db.query(
      'SELECT id FROM student_users WHERE student_id = ?', [studentId]
    );
    if (existing.length > 0) {
      await db.query(
        'UPDATE student_users SET email = ? WHERE student_id = ?',
        [email, studentId]
      );
      return;
    }
    const hash = await bcrypt.hash('student123', 10);
    await db.query(
      'INSERT INTO student_users (student_id, email, password_hash) VALUES (?,?,?)',
      [studentId, email, hash]
    );
    console.log(`✅ Login created for: ${name} | ${email}`);
  } catch (err) {
    console.error('Auto-create login failed:', err.message);
  }
}

async function autoUpdateStudentLogin(studentId, newEmail, name) {
  try {
    const [existing] = await db.query(
      'SELECT id FROM student_users WHERE student_id = ?', [studentId]
    );
    if (existing.length > 0) {
      await db.query(
        'UPDATE student_users SET email = ? WHERE student_id = ?',
        [newEmail, studentId]
      );
    } else {
      await autoCreateStudentLogin(studentId, newEmail, name);
    }
  } catch (err) {
    console.error('Auto-update login failed:', err.message);
  }
}

module.exports = studentController;