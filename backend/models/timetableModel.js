const db = require('../config/db');

const TimetableModel = {

    getByClass: async (classId) => {
        const [rows] = await db.query(`
      SELECT
        t.*,
        s.name  AS subject_name,
        s.code  AS subject_code,
        te.name AS teacher_name
      FROM timetable t
      JOIN subjects  s  ON t.subject_id = s.id
      JOIN teachers  te ON t.teacher_id = te.id
      WHERE t.class_id = ?
      ORDER BY
        FIELD(t.day,'Sunday','Monday','Tuesday',
              'Wednesday','Thursday','Friday','Saturday'),
        t.period_no
    `, [classId]);
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(`
      SELECT t.*, s.name AS subject_name, te.name AS teacher_name
      FROM timetable t
      JOIN subjects s  ON t.subject_id = s.id
      JOIN teachers te ON t.teacher_id = te.id
      WHERE t.id = ?
    `, [id]);
        return rows[0] || null;
    },

    create: async ({ class_id, subject_id, teacher_id,
        day, period_no, start_time, end_time }) => {
        const [result] = await db.query(
            `INSERT INTO timetable
         (class_id, subject_id, teacher_id, day, period_no, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [class_id, subject_id, teacher_id, day, period_no, start_time, end_time]
        );
        return result.insertId;
    },

    update: async (id, { subject_id, teacher_id, start_time, end_time }) => {
        const [result] = await db.query(
            `UPDATE timetable
       SET subject_id=?, teacher_id=?, start_time=?, end_time=?
       WHERE id=?`,
            [subject_id, teacher_id, start_time, end_time, id]
        );
        return result.affectedRows;
    },

    delete: async (id) => {
        const [result] = await db.query(
            'DELETE FROM timetable WHERE id = ?', [id]
        );
        return result.affectedRows;
    },

    // Check if period slot is already taken for this class
    slotExists: async (classId, day, periodNo, excludeId = null) => {
        let query = `SELECT id FROM timetable
                  WHERE class_id=? AND day=? AND period_no=?`;
        const params = [classId, day, periodNo];
        if (excludeId) { query += ' AND id != ?'; params.push(excludeId); }
        const [rows] = await db.query(query, params);
        return rows.length > 0;
    },

    // Delete all periods for a class (for full reset)
    deleteByClass: async (classId) => {
        await db.query('DELETE FROM timetable WHERE class_id = ?', [classId]);
    }

};

module.exports = TimetableModel;