const express  = require('express');
const router   = express.Router();
const { body } = require('express-validator');
const studentController = require('../controllers/studentController');
const { protect }       = require('../middleware/auth');
const upload            = require('../config/upload');
const bcrypt            = require('bcryptjs');
const db                = require('../config/db');

const studentValidation = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('email').optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage('Invalid email').normalizeEmail(),
  body('phone').optional({ nullable: true, checkFalsy: true })
    .matches(/^[0-9+\-\s]{7,20}$/).withMessage('Invalid phone'),
  body('dob').optional({ nullable: true, checkFalsy: true })
    .isDate().withMessage('Invalid date'),
  body('class_id').optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 }).withMessage('Invalid class_id'),
  body('parent_name').optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage('Parent name too long'),
  body('admission_date').optional({ nullable: true, checkFalsy: true })
    .isDate().withMessage('Invalid admission date')
];

// All routes protected
router.get('/',         protect, studentController.getAll);
router.get('/:id',      protect, studentController.getOne);
router.get('/:id/profile', protect, studentController.getProfile);
router.post('/',        protect, studentValidation, studentController.create);
router.put('/:id',      protect, studentValidation, studentController.update);
router.delete('/:id',   protect, studentController.delete);

// Photo upload
router.post('/:id/photo', protect,
  upload.single('photo'),
  studentController.uploadPhoto
);

// Create login account for student
router.post('/:id/create-login', protect, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false, message: 'Password must be at least 6 characters'
      });
    }
    const [[student]] = await db.query(
      'SELECT id, email FROM students WHERE id = ?', [req.params.id]
    );
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (!student.email) {
      return res.status(400).json({
        success: false, message: 'Student has no email. Add one first.'
      });
    }
    const [[existing]] = await db.query(
      'SELECT id FROM student_users WHERE student_id = ?', [req.params.id]
    );
    if (existing) {
      return res.status(409).json({
        success: false, message: 'Login already exists for this student'
      });
    }
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO student_users (student_id, email, password_hash) VALUES (?,?,?)',
      [student.id, student.email, hash]
    );
    res.status(201).json({
      success: true,
      message: `Login created. Student can sign in with ${student.email}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
});

module.exports = router;