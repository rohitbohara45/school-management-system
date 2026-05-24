const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const classController = require('../controllers/classController');
const { protect } = require('../middleware/auth');

const classValidation = [
  body('name').trim().notEmpty().withMessage('Class name is required'),
  body('section').trim().notEmpty().withMessage('Section is required'),
  body('teacher_id').optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 }).withMessage('Invalid teacher'),
  body('capacity').optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1, max: 200 }).withMessage('Capacity must be 1-200')
];

// ALL routes protected
router.get('/',      protect, classController.getAll);
router.get('/:id',   protect, classController.getOne);
router.post('/',     protect, classValidation, classController.create);
router.put('/:id',   protect, classValidation, classController.update);
router.delete('/:id',protect, classController.delete);

module.exports = router;