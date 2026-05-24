const { validationResult } = require('express-validator');
const TimetableModel = require('../models/timetableModel');

const timetableController = {

    getByClass: async (req, res) => {
        try {
            const entries = await TimetableModel.getByClass(req.params.classId);
            res.json({ success: true, data: entries });
        } catch (err) {
            res.status(500).json({
                success: false, message: 'Failed to fetch timetable'
            });
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
            const { class_id, subject_id, teacher_id,
                day, period_no, start_time, end_time } = req.body;

            // Check slot not already taken
            const taken = await TimetableModel.slotExists(class_id, day, period_no);
            if (taken) {
                return res.status(409).json({
                    success: false,
                    message: `Period ${period_no} on ${day} is already assigned for this class`
                });
            }

            const newId = await TimetableModel.create({
                class_id, subject_id, teacher_id, day, period_no, start_time, end_time
            });
            const entry = await TimetableModel.getById(newId);
            res.status(201).json({
                success: true, message: 'Period added', data: entry
            });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to add period' });
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
            const existing = await TimetableModel.getById(req.params.id);
            if (!existing) {
                return res.status(404).json({
                    success: false, message: 'Entry not found'
                });
            }
            const { subject_id, teacher_id, start_time, end_time } = req.body;
            await TimetableModel.update(req.params.id, {
                subject_id, teacher_id, start_time, end_time
            });
            const updated = await TimetableModel.getById(req.params.id);
            res.json({ success: true, message: 'Period updated', data: updated });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to update period' });
        }
    },

    delete: async (req, res) => {
        try {
            const existing = await TimetableModel.getById(req.params.id);
            if (!existing) {
                return res.status(404).json({
                    success: false, message: 'Entry not found'
                });
            }
            await TimetableModel.delete(req.params.id);
            res.json({ success: true, message: 'Period deleted' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to delete period' });
        }
    },

    deleteByClass: async (req, res) => {
        try {
            await TimetableModel.deleteByClass(req.params.classId);
            res.json({ success: true, message: 'Timetable cleared' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to clear timetable' });
        }
    }

};

module.exports = timetableController;