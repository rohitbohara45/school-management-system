const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const subjectController = require('../controllers/subjectController');
const { protect } = require('../middleware/auth');

const subjectValidation = [
    body('name').trim().notEmpty().withMessage('Subject name is required')
        .isLength({ max: 100 }).withMessage('Name too long'),
    body('code').trim().notEmpty().withMessage('Subject code is required')
        .isLength({ max: 20 }).withMessage('Code too long')
        .matches(/^[A-Za-z0-9_]+$/).withMessage('Code must be letters/numbers only'),
    body('class_id').isInt({ min: 1 }).withMessage('Valid class required'),
    body('full_marks').optional().isInt({ min: 1, max: 1000 })
        .withMessage('Full marks must be between 1 and 1000'),
    body('pass_marks').optional().isInt({ min: 1 })
        .withMessage('Pass marks must be positive'),
    body('is_optional').optional().isBoolean()
        .withMessage('is_optional must be true or false')
];

router.get('/', protect, subjectController.getAll);
router.get('/class/:classId', protect, subjectController.getByClass);
router.get('/:id', protect, subjectController.getOne);
router.post('/', protect, subjectValidation, subjectController.create);
router.put('/:id', protect, subjectValidation.slice(0, 4), subjectController.update);
router.delete('/:id', protect, subjectController.delete);

module.exports = router;