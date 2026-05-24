const { validationResult } = require('express-validator');
const MarksModel = require('../models/marksModel');

const marksController = {

  getAll: async (req, res) => {
    try {
      const marks = await MarksModel.getAll({
        class_id: req.query.class_id,
        term:     req.query.term
      });
      res.json({ success: true, count: marks.length, data: marks });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch marks' });
    }
  },

  getByStudent: async (req, res) => {
    try {
      const marks = await MarksModel.getByStudent(req.params.studentId);
      res.json({ success: true, data: marks });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch marks' });
    }
  },

  create: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });

    try {
      const { student_id, subject, marks_obtained, total_marks, term } = req.body;
      if (marks_obtained > total_marks) {
        return res.status(400).json({
          success: false,
          message: 'Marks obtained cannot exceed total marks'
        });
      }
      const newId = await MarksModel.create({ student_id, subject, marks_obtained, total_marks, term });
      const mark  = await MarksModel.getById(newId);
      res.status(201).json({ success: true, message: 'Marks added', data: mark });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to add marks' });
    }
  },

  update: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });

    try {
      const existing = await MarksModel.getById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Record not found' });

      const { subject, marks_obtained, total_marks, term } = req.body;
      if (marks_obtained > (total_marks || existing.total_marks)) {
        return res.status(400).json({
          success: false,
          message: 'Marks obtained cannot exceed total marks'
        });
      }
      await MarksModel.update(req.params.id, { subject, marks_obtained, total_marks, term });
      const updated = await MarksModel.getById(req.params.id);
      res.json({ success: true, message: 'Marks updated', data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to update marks' });
    }
  },

  delete: async (req, res) => {
    try {
      const existing = await MarksModel.getById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Record not found' });
      await MarksModel.delete(req.params.id);
      res.json({ success: true, message: 'Marks deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to delete marks' });
    }
  }

};

module.exports = marksController;