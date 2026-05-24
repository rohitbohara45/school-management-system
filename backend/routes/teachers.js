const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const teacherController = require('../controllers/teacherController');
const { protect } = require('../middleware/auth');

const teacherValidation = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('email').optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage('Invalid email').normalizeEmail(),
  body('phone').optional({ nullable: true, checkFalsy: true })
    .matches(/^[0-9+\-\s]{7,20}$/).withMessage('Invalid phone'),
  body('subject').optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('Subject too long')
];

// ALL routes protected
router.get('/',      protect, teacherController.getAll);
router.get('/:id',   protect, teacherController.getOne);
router.post('/',     protect, teacherValidation, teacherController.create);
router.put('/:id',   protect, teacherValidation, teacherController.update);
router.delete('/:id',protect, teacherController.delete);

module.exports = router;