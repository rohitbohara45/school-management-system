const { validationResult } = require('express-validator');
const NoticeModel = require('../models/noticeModel');

const noticeController = {

    getAll: async (req, res) => {
        try {
            const category = req.query.category || null;
            const activeOnly = req.query.all !== 'true';
            const notices = await NoticeModel.getAll(category, activeOnly);
            res.json({ success: true, count: notices.length, data: notices });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to fetch notices' });
        }
    },

    getOne: async (req, res) => {
        try {
            const notice = await NoticeModel.getById(req.params.id);
            if (!notice) {
                return res.status(404).json({ success: false, message: 'Notice not found' });
            }
            res.json({ success: true, data: notice });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to fetch notice' });
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
            const { title, content, category, posted_date } = req.body;
            const newId = await NoticeModel.create({
                title, content, category,
                admin_id: req.admin.id,
                posted_date: posted_date || new Date().toISOString().split('T')[0]
            });
            const notice = await NoticeModel.getById(newId);
            res.status(201).json({ success: true, message: 'Notice posted', data: notice });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to post notice' });
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
            const existing = await NoticeModel.getById(req.params.id);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Notice not found' });
            }
            await NoticeModel.update(req.params.id, req.body);
            const updated = await NoticeModel.getById(req.params.id);
            res.json({ success: true, message: 'Notice updated', data: updated });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to update notice' });
        }
    },

    delete: async (req, res) => {
        try {
            const existing = await NoticeModel.getById(req.params.id);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Notice not found' });
            }
            await NoticeModel.delete(req.params.id);
            res.json({ success: true, message: 'Notice deleted' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to delete notice' });
        }
    }

};

module.exports = noticeController;