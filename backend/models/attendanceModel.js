const db = require('../config/db');

const AttendanceModel = {

  getByDate: async (date, classId = null) => {
    let query = `
      SELECT
        a.id, a.student_id, a.att_date, a.status,
        s.name    AS student_name,
        c.name    AS class_name,
        c.section AS class_section
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE a.att_date = ?
    `;
    const params = [date];
    if (classId) { query += ' AND s.class_id = ?'; params.push(classId); }
    query += ' ORDER BY s.name';
    const [rows] = await db.query(query, params);
    return rows;
  },

  getTodaySummary: async () => {
    const today = new Date().toISOString().split('T')[0];
    const [[row]] = await db.query(`
      SELECT
        COUNT(*)              AS total,
        SUM(status='present') AS present,
        SUM(status='absent')  AS absent,
        SUM(status='late')    AS late
      FROM attendance
      WHERE att_date = ?
    `, [today]);
    return row;
  },

  // Monthly summary per student
  getMonthlySummary: async (classId, year, month) => {
    const [rows] = await db.query(`
      SELECT
        s.id   AS student_id,
        s.name AS student_name,
        COUNT(a.id)              AS total_days,
        SUM(a.status='present')  AS present,
        SUM(a.status='absent')   AS absent,
        SUM(a.status='late')     AS late,
        ROUND(
          (SUM(a.status='present') /
           NULLIF(COUNT(a.id), 0)) * 100
        , 1) AS percentage
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id
        AND YEAR(a.att_date)  = ?
        AND MONTH(a.att_date) = ?
      WHERE s.class_id = ? AND s.is_active = 1
      GROUP BY s.id
      ORDER BY s.name
    `, [year, month, classId]);
    return rows;
  },

  // Students with attendance below threshold
  getLowAttendance: async (threshold = 75, classId = null) => {
    let query = `
      SELECT
        s.id, s.name, s.email,
        c.name    AS class_name,
        c.section AS class_section,
        COUNT(a.id)              AS total_days,
        SUM(a.status='present')  AS present_days,
        ROUND(
          (SUM(a.status='present') /
           NULLIF(COUNT(a.id), 0)) * 100
        , 1) AS percentage
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendance a ON a.student_id = s.id
      WHERE s.is_active = 1
    `;
    const params = [];
    if (classId) { query += ' AND s.class_id = ?'; params.push(classId); }
    query += `
      GROUP BY s.id
      HAVING percentage < ? AND total_days > 0
      ORDER BY percentage ASC
    `;
    params.push(threshold);
    const [rows] = await db.query(query, params);
    return rows;
  },

  upsert: async (student_id, att_date, status) => {
    await db.query(`
      INSERT INTO attendance (student_id, att_date, status)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `, [student_id, att_date, status]);
  },

  bulkUpsert: async (records) => {
    for (const r of records) {
      await AttendanceModel.upsert(r.student_id, r.att_date, r.status);
    }
  },

  getByStudent: async (studentId) => {
    const [rows] = await db.query(`
      SELECT * FROM attendance
      WHERE student_id = ?
      ORDER BY att_date DESC
      LIMIT 30
    `, [studentId]);
    return rows;
  }

};

module.exports = AttendanceModel;