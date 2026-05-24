const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const feeController = require('../controllers/feeController');
const { protect } = require('../middleware/auth');

const feeValidation = [
    body('student_id').isInt({ min: 1 }).withMessage('Valid student required'),
    body('month').trim().notEmpty().withMessage('Month is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    body('status').isIn(['paid', 'due', 'waived']).withMessage('Invalid status'),
    body('academic_year').optional()
        .isInt({ min: 2000, max: 2100 }).withMessage('Invalid year')
];

const updateValidation = [
    body('status').isIn(['paid', 'due', 'waived']).withMessage('Invalid status'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    body('month').trim().notEmpty().withMessage('Month required')
];

router.get('/', protect, feeController.getAll);
router.get('/summary', protect, feeController.getSummary);
router.get('/:id', protect, feeController.getOne);
router.get('/:id/receipt', protect, feeController.getReceipt);
router.post('/', protect, feeValidation, feeController.create);
router.post('/bulk', protect, feeController.bulkCreate);
router.put('/:id', protect, updateValidation, feeController.update);
router.delete('/:id', protect, feeController.delete);

module.exports = router;