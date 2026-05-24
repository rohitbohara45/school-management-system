const { validationResult } = require('express-validator');
const ExamModel = require('../models/examModel');

const examController = {

  getAll: async (req, res) => {
    try {
      const exams = await ExamModel.getAll(
        req.query.class_id || null,
        req.query.year     || null
      );
      res.json({ success: true, count: exams.length, data: exams });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch exams' });
    }
  },

  getOne: async (req, res) => {
    try {
      const exam = await ExamModel.getById(req.params.id);
      if (!exam) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      res.json({ success: true, data: exam });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch exam' });
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
      const { name, type, class_id, academic_year, exam_date, description } = req.body;
      const newId = await ExamModel.create({
        name, type, class_id, academic_year, exam_date, description
      });
      const exam = await ExamModel.getById(newId);
      res.status(201).json({ success: true, message: 'Exam created', data: exam });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to create exam' });
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
      const existing = await ExamModel.getById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      await ExamModel.update(req.params.id, req.body);
      const updated = await ExamModel.getById(req.params.id);
      res.json({ success: true, message: 'Exam updated', data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to update exam' });
    }
  },

  delete: async (req, res) => {
    try {
      const existing = await ExamModel.getById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      await ExamModel.delete(req.params.id);
      res.json({ success: true, message: 'Exam deleted' });
    } catch (err) {
      res.status(500).json({
        success: false, message: err.message || 'Failed to delete exam'
      });
    }
  },

  // GET marks entry sheet for an exam
  getMarksSheet: async (req, res) => {
    try {
      const sheet = await ExamModel.getMarksSheet(req.params.id);
      if (!sheet) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      res.json({ success: true, data: sheet });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to load marks sheet' });
    }
  },

  // POST save all marks for an exam
  saveMarks: async (req, res) => {
    try {
      const { marks } = req.body;
      if (!marks || !Array.isArray(marks) || !marks.length) {
        return res.status(400).json({
          success: false, message: 'marks array is required'
        });
      }
      await ExamModel.saveMarks(req.params.id, marks);
      res.json({
        success: true,
        message: `Marks saved for ${marks.length} records`
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to save marks' });
    }
  },

  // GET result for one student
  getStudentResult: async (req, res) => {
    try {
      const result = await ExamModel.getStudentResult(
        req.params.studentId,
        req.params.examId
      );
      if (!result) {
        return res.status(404).json({
          success: false, message: 'No marks found for this student in this exam'
        });
      }
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch result' });
    }
  },

  // GET full class result
  getClassResult: async (req, res) => {
    try {
      const result = await ExamModel.getClassResult(req.params.id);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch results' });
    }
  }

};

module.exports = examController;