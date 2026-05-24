const AttendanceModel = require('../models/attendanceModel');

const attendanceController = {

  getByDate: async (req, res) => {
    try {
      const date    = req.query.date || new Date().toISOString().split('T')[0];
      const classId = req.query.class_id || null;
      const records = await AttendanceModel.getByDate(date, classId);
      res.json({ success: true, data: records, date });
    } catch (err) {
      res.status(500).json({
        success: false, message: 'Failed to fetch attendance'
      });
    }
  },

  getTodaySummary: async (req, res) => {
    try {
      const summary    = await AttendanceModel.getTodaySummary();
      const total      = summary.total   || 0;
      const present    = summary.present || 0;
      const percentage = total > 0
        ? Math.round((present / total) * 100) : 0;
      res.json({ success: true, data: summary, percentage });
    } catch (err) {
      res.status(500).json({
        success: false, message: 'Failed to fetch summary'
      });
    }
  },

  getMonthlySummary: async (req, res) => {
    try {
      const { classId } = req.params;
      const year  = req.query.year  || new Date().getFullYear();
      const month = req.query.month || (new Date().getMonth() + 1);

      const summary = await AttendanceModel.getMonthlySummary(
        classId, year, month
      );
      res.json({
        success: true,
        data: summary,
        meta: { year, month, classId }
      });
    } catch (err) {
      res.status(500).json({
        success: false, message: 'Failed to fetch monthly summary'
      });
    }
  },

  getLowAttendance: async (req, res) => {
    try {
      const threshold = req.query.threshold || 75;
      const classId   = req.query.class_id  || null;
      const students  = await AttendanceModel.getLowAttendance(
        threshold, classId
      );
      res.json({ success: true, data: students, threshold });
    } catch (err) {
      res.status(500).json({
        success: false, message: 'Failed to fetch low attendance'
      });
    }
  },

  bulkMark: async (req, res) => {
    try {
      const { date, records } = req.body;
      if (!date || !records || !Array.isArray(records) || !records.length) {
        return res.status(400).json({
          success: false, message: 'date and records array required'
        });
      }
      const validStatuses = ['present','absent','late'];
      for (const r of records) {
        if (!r.student_id || !validStatuses.includes(r.status)) {
          return res.status(400).json({
            success: false,
            message: 'Each record needs student_id and valid status'
          });
        }
      }
      const full = records.map(r => ({ ...r, att_date: date }));
      await AttendanceModel.bulkUpsert(full);
      res.json({
        success: true,
        message: `Attendance marked for ${records.length} students`
      });
    } catch (err) {
      res.status(500).json({
        success: false, message: 'Failed to save attendance'
      });
    }
  },

  getByStudent: async (req, res) => {
    try {
      const records = await AttendanceModel.getByStudent(req.params.id);
      res.json({ success: true, data: records });
    } catch (err) {
      res.status(500).json({
        success: false, message: 'Failed to fetch student attendance'
      });
    }
  }

};

module.exports = attendanceController;