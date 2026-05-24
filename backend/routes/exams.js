const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const examController = require('../controllers/examController');
const { protect }    = require('../middleware/auth');

const examValidation = [
  body('name').trim().notEmpty().withMessage('Exam name is required'),
  body('type').isIn(['unit_test','mid_term','final','other'])
    .withMessage('Invalid exam type'),
  body('class_id').isInt({ min: 1 }).withMessage('Valid class required'),
  body('academic_year').optional().isInt({ min: 2000, max: 2100 })
    .withMessage('Invalid year'),
  body('exam_date').optional({ nullable: true, checkFalsy: true })
    .isDate().withMessage('Invalid date')
];

router.get('/',                              protect, examController.getAll);
router.get('/:id',                           protect, examController.getOne);
router.get('/:id/marks-sheet',               protect, examController.getMarksSheet);
router.get('/:id/result',                    protect, examController.getClassResult);
router.get('/:examId/result/:studentId',     protect, examController.getStudentResult);
router.post('/',     protect, examValidation, examController.create);
router.post('/:id/marks', protect,            examController.saveMarks);
router.put('/:id',   protect, examValidation.slice(0,2), examController.update);
router.delete('/:id', protect,               examController.delete);

module.exports = router;