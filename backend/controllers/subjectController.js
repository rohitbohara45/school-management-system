const { validationResult } = require('express-validator');
const SubjectModel = require('../models/subjectModel');

const subjectController = {

    getAll: async (req, res) => {
        try {
            const subjects = await SubjectModel.getAll(req.query.class_id || null);
            res.json({ success: true, count: subjects.length, data: subjects });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
        }
    },

    getByClass: async (req, res) => {
        try {
            const subjects = await SubjectModel.getByClass(req.params.classId);
            res.json({ success: true, data: subjects });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
        }
    },

    getOne: async (req, res) => {
        try {
            const subject = await SubjectModel.getById(req.params.id);
            if (!subject) {
                return res.status(404).json({ success: false, message: 'Subject not found' });
            }
            res.json({ success: true, data: subject });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to fetch subject' });
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
            const { name, code, class_id, full_marks, pass_marks, is_optional } = req.body;

            const taken = await SubjectModel.codeExists(code, class_id);
            if (taken) {
                return res.status(409).json({
                    success: false,
                    message: `Subject code ${code.toUpperCase()} already exists in this class`
                });
            }

            const newId = await SubjectModel.create({
                name, code, class_id, full_marks, pass_marks, is_optional
            });
            const subject = await SubjectModel.getById(newId);
            res.status(201).json({
                success: true, message: 'Subject created', data: subject
            });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to create subject' });
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
            const existing = await SubjectModel.getById(id);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Subject not found' });
            }

            const { name, code, full_marks, pass_marks, is_optional } = req.body;

            const taken = await SubjectModel.codeExists(code, existing.class_id, id);
            if (taken) {
                return res.status(409).json({
                    success: false,
                    message: `Subject code ${code.toUpperCase()} already exists in this class`
                });
            }

            await SubjectModel.update(id, { name, code, full_marks, pass_marks, is_optional });
            const updated = await SubjectModel.getById(id);
            res.json({ success: true, message: 'Subject updated', data: updated });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to update subject' });
        }
    },

    delete: async (req, res) => {
        try {
            const existing = await SubjectModel.getById(req.params.id);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Subject not found' });
            }
            await SubjectModel.delete(req.params.id);
            res.json({ success: true, message: 'Subject deleted' });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message || 'Failed to delete subject'
            });
        }
    }

};

module.exports = subjectController;