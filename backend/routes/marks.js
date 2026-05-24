const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const marksController = require('../controllers/marksController');
const { protect } = require('../middleware/auth');

const marksValidation = [
  body('student_id').isInt({ min: 1 }).withMessage('Valid student_id required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('marks_obtained').isInt({ min: 0 }).withMessage('Marks must be non-negative'),
  body('total_marks').optional().isInt({ min: 1 }).withMessage('Total marks must be positive'),
  body('term').optional().trim().notEmpty().withMessage('Term cannot be empty')
];

// ALL routes protected
router.get('/',                   protect, marksController.getAll);
router.get('/student/:studentId', protect, marksController.getByStudent);
router.post('/',     protect, marksValidation, marksController.create);
router.put('/:id',   protect, marksValidation, marksController.update);
router.delete('/:id',protect,                  marksController.delete);

module.exports = router;