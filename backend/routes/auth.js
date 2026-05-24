const express   = require('express');
const router    = express.Router();
const { body }  = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { protect }    = require('../middleware/auth');

// Max 10 login attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 4 }).withMessage('Password must be at least 4 characters')
];

router.post('/login',  loginLimiter, loginValidation, authController.login);
router.post('/logout', authController.logout);
router.get('/me',      protect, authController.getMe);
router.put('/change-password', protect, authController.changePassword);

// POST /api/auth/reset-password  (no token needed — uses RESET_SECRET)
router.post('/reset-password', [
  body('email').trim().notEmpty().isEmail().withMessage('Valid email required'),
  body('resetKey').notEmpty().withMessage('Reset key is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.resetPassword);
module.exports = router;