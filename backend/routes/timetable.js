const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const timetableController = require('../controllers/timetableController');
const { protect } = require('../middleware/auth');

const ttValidation = [
    body('class_id').isInt({ min: 1 }).withMessage('Valid class required'),
    body('subject_id').isInt({ min: 1 }).withMessage('Valid subject required'),
    body('teacher_id').isInt({ min: 1 }).withMessage('Valid teacher required'),
    body('day').isIn(['Sunday', 'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday'])
        .withMessage('Invalid day'),
    body('period_no').isInt({ min: 1, max: 12 })
        .withMessage('Period must be between 1 and 12'),
    body('start_time').matches(/^\d{2}:\d{2}$/)
        .withMessage('Start time must be HH:MM'),
    body('end_time').matches(/^\d{2}:\d{2}$/)
        .withMessage('End time must be HH:MM')
];

const updateValidation = [
    body('subject_id').isInt({ min: 1 }).withMessage('Valid subject required'),
    body('teacher_id').isInt({ min: 1 }).withMessage('Valid teacher required'),
    body('start_time').matches(/^\d{2}:\d{2}$/).withMessage('Invalid time'),
    body('end_time').matches(/^\d{2}:\d{2}$/).withMessage('Invalid time')
];

router.get('/class/:classId', protect, timetableController.getByClass);
router.post('/', protect, ttValidation, timetableController.create);
router.put('/:id', protect, updateValidation, timetableController.update);
router.delete('/:id', protect, timetableController.delete);
router.delete('/class/:classId', protect, timetableController.deleteByClass);

module.exports = router;