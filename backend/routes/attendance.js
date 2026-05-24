const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');

router.get('/today', protect, attendanceController.getTodaySummary);
router.get('/low', protect, attendanceController.getLowAttendance);
router.get('/monthly/:classId', protect, attendanceController.getMonthlySummary);
router.get('/student/:id', protect, attendanceController.getByStudent);
router.get('/', protect, attendanceController.getByDate);
router.post('/bulk', protect, attendanceController.bulkMark);

module.exports = router;