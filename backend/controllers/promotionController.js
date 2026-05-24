const PromotionModel = require('../models/promotionModel');

const promotionController = {

    getEligible: async (req, res) => {
        try {
            const students = await PromotionModel.getEligibleStudents(
                req.params.classId
            );
            res.json({ success: true, data: students });
        } catch (err) {
            res.status(500).json({
                success: false, message: 'Failed to fetch students'
            });
        }
    },

    getHistory: async (req, res) => {
        try {
            const history = await PromotionModel.getByStudent(
                req.params.studentId
            );
            res.json({ success: true, data: history });
        } catch (err) {
            res.status(500).json({
                success: false, message: 'Failed to fetch history'
            });
        }
    },

    getByYear: async (req, res) => {
        try {
            const history = await PromotionModel.getByYear(
                req.params.year
            );
            res.json({ success: true, data: history });
        } catch (err) {
            res.status(500).json({
                success: false, message: 'Failed to fetch promotions'
            });
        }
    },

    promoteOne: async (req, res) => {
        try {
            const {
                student_id, from_class_id, to_class_id,
                from_year, to_year
            } = req.body;

            if (!student_id || !from_class_id || !to_class_id ||
                !from_year || !to_year) {
                return res.status(400).json({
                    success: false,
                    message: 'student_id, from_class_id, to_class_id, from_year, to_year required'
                });
            }

            await PromotionModel.promoteStudent({
                student_id, from_class_id, to_class_id,
                from_year, to_year,
                promoted_by: req.admin.id
            });

            res.json({
                success: true,
                message: 'Student promoted successfully'
            });
        } catch (err) {
            console.error('promoteOne error:', err);
            res.status(500).json({
                success: false, message: 'Promotion failed: ' + err.message
            });
        }
    },

    promoteClass: async (req, res) => {
        try {
            const {
                from_class_id, to_class_id,
                from_year, to_year
            } = req.body;

            if (!from_class_id || !to_class_id || !from_year || !to_year) {
                return res.status(400).json({
                    success: false,
                    message: 'from_class_id, to_class_id, from_year, to_year required'
                });
            }

            const result = await PromotionModel.promoteClass({
                from_class_id, to_class_id,
                from_year, to_year,
                promoted_by: req.admin.id
            });

            res.json({
                success: true,
                message: `${result.promoted} student(s) promoted successfully`,
                data: result
            });
        } catch (err) {
            console.error('promoteClass error:', err);
            res.status(500).json({
                success: false, message: 'Bulk promotion failed: ' + err.message
            });
        }
    }

};

module.exports = promotionController;