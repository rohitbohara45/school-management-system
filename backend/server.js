const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const logger = require('./config/logger');
const app = express();

// ── Security headers ──────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── HTTP request logging (morgan → winston) ───────────────────
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));  // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Serve uploaded files
app.use('/uploads', require('express').static(
  require('path').join(__dirname, 'uploads')
));

// ── Global rate limiting (all routes) ─────────────────────────
// ── Rate limiting ─────────────────────────────────────────────
// Strict limit only on login (brute force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' }
});
app.use('/api/auth/login', loginLimiter);

// Relaxed limit on all other API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 500 : 2000,
  message: { success: false, message: 'Too many requests, please slow down.' },
  skip: (req) => {
    // Skip rate limiting in development entirely
    return process.env.NODE_ENV !== 'production';
  }
});
app.use('/api/', apiLimiter);
// ── Health check ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: 'School Management API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── Dashboard stats (protected) ───────────────────────────────
const { protect } = require('./middleware/auth');
app.get('/api/stats', protect, async (req, res) => {
  try {
    const db = require('./config/db');
    const today = new Date().toISOString().split('T')[0];

    const [[{ students }]] = await db.query('SELECT COUNT(*) AS students FROM students');
    const [[{ teachers }]] = await db.query('SELECT COUNT(*) AS teachers FROM teachers');
    const [[{ classes }]] = await db.query('SELECT COUNT(*) AS classes  FROM classes');
    const [[att]] = await db.query(
      `SELECT COUNT(*) AS total, SUM(status='present') AS present
       FROM attendance WHERE att_date = ?`, [today]
    );

    const percentage = att.total > 0
      ? Math.round((att.present / att.total) * 100) : 0;

    res.json({
      success: true,
      data: { students, teachers, classes, attendanceToday: percentage }
    });
  } catch (err) {
    logger.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/student', require('./routes/student'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/marks', require('./routes/marks'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/reset', require('./routes/reset'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/promotion', require('./routes/promotion'));
// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  if (err.code === 'ER_DUP_ENTRY')
    return res.status(409).json({ success: false, message: 'Record already exists' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2')
    return res.status(409).json({ success: false, message: 'Cannot delete — referenced by other data' });
  if (err.name === 'JsonWebTokenError')
    return res.status(401).json({ success: false, message: 'Invalid token' });
  if (err.name === 'TokenExpiredError')
    return res.status(401).json({ success: false, message: 'Token expired' });

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'   // Hide details in production
      : err.message               // Show details in development
  });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});