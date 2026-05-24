const { validationResult } = require('express-validator');
const ClassModel = require('../models/classModel');

const classController = {

  getAll: async (req, res) => {
    try {
      const classes = await ClassModel.getAll();
      res.json({ success: true, count: classes.length, data: classes });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch classes' });
    }
  },

  getOne: async (req, res) => {
    try {
      const cls = await ClassModel.getById(req.params.id);
      if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
      res.json({ success: true, data: cls });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch class' });
    }
  },

  create: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });

    try {
      const { name, section, teacher_id, capacity } = req.body;
      const newId = await ClassModel.create({ name, section, teacher_id, capacity });
      const newClass = await ClassModel.getById(newId);
      res.status(201).json({ success: true, message: 'Class created', data: newClass });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY')
        return res.status(409).json({ success: false, message: 'This class/section already exists' });
      res.status(500).json({ success: false, message: 'Failed to create class' });
    }
  },

  update: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });

    try {
      const { id } = req.params;
      const existing = await ClassModel.getById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Class not found' });

      const { name, section, teacher_id, capacity } = req.body;
      await ClassModel.update(id, { name, section, teacher_id, capacity });
      const updated = await ClassModel.getById(id);
      res.json({ success: true, message: 'Class updated', data: updated });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY')
        return res.status(409).json({ success: false, message: 'This class/section already exists' });
      res.status(500).json({ success: false, message: 'Failed to update class' });
    }
  },

  delete: async (req, res) => {
  try {
    const existing = await ClassModel.getById(req.params.id);
    if (!existing)
      return res.status(404).json({ success: false, message: 'Class not found' });

    // Check if any students are still assigned
    const db = require('../config/db');
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM students WHERE class_id = ?',
      [req.params.id]
    );

    if (count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — ${count} student(s) are assigned to this class. Reassign them first.`
      });
    }

    await ClassModel.delete(req.params.id);
    res.json({ success: true, message: 'Class deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete class' });
  }
}

};

module.exports = classController;