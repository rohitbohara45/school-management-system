const db = require('../config/db');

const ClassModel = {

  getAll: async () => {
    const [rows] = await db.query(`
      SELECT
        c.*,
        t.name  AS teacher_name,
        COUNT(s.id) AS student_count
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN students s ON s.class_id   = c.id
      GROUP BY c.id
      ORDER BY c.name, c.section
    `);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(`
      SELECT c.*, t.name AS teacher_name
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = ?
    `, [id]);
    return rows[0] || null;
  },

  create: async ({ name, section, teacher_id, capacity }) => {
    const [result] = await db.query(
      `INSERT INTO classes (name, section, teacher_id, capacity)
       VALUES (?, ?, ?, ?)`,
      [name, section, teacher_id || null, capacity || 40]
    );
    return result.insertId;
  },

  update: async (id, { name, section, teacher_id, capacity }) => {
    const [result] = await db.query(
      `UPDATE classes SET name=?, section=?, teacher_id=?, capacity=? WHERE id=?`,
      [name, section, teacher_id || null, capacity || 40, id]
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await db.query('DELETE FROM classes WHERE id = ?', [id]);
    return result.affectedRows;
  }

};

module.exports = ClassModel;