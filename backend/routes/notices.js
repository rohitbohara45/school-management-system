const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const noticeController = require('../controllers/noticeController');
const { protect } = require('../middleware/auth');

const noticeValidation = [
    body('title').trim().notEmpty().withMessage('Title is required')
        .isLength({ max: 200 }).withMessage('Title too long'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('category')
        .isIn(['general', 'exam', 'holiday', 'event', 'fee', 'other'])
        .withMessage('Invalid category'),
    body('posted_date').optional({ nullable: true, checkFalsy: true })
        .isDate().withMessage('Invalid date')
];

// GET is public — students and teachers can read notices
router.get('/', noticeController.getAll);
router.get('/:id', noticeController.getOne);

// Write routes require admin login
router.post('/', protect, noticeValidation, noticeController.create);
router.put('/:id', protect, noticeValidation, noticeController.update);
router.delete('/:id', protect, noticeController.delete);

module.exports = router;