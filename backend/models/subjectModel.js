const db = require('../config/db');

const SubjectModel = {

  getAll: async (classId = null) => {
    let query = `
      SELECT
        s.*,
        c.name    AS class_name,
        c.section AS class_section
      FROM subjects s
      JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (classId) {
      query += ' AND s.class_id = ?';
      params.push(classId);
    }
    query += ' ORDER BY c.name, c.section, s.name';
    const [rows] = await db.query(query, params);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT s.*, c.name AS class_name, c.section AS class_section
       FROM subjects s
       JOIN classes c ON s.class_id = c.id
       WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  getByClass: async (classId) => {
    const [rows] = await db.query(
      `SELECT * FROM subjects WHERE class_id = ?
       ORDER BY is_optional, name`,
      [classId]
    );
    return rows;
  },

  create: async ({ name, code, class_id, full_marks, pass_marks, is_optional }) => {
    const [result] = await db.query(
      `INSERT INTO subjects (name, code, class_id, full_marks, pass_marks, is_optional)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, code.toUpperCase(), class_id,
       full_marks || 100, pass_marks || 40, is_optional || 0]
    );
    return result.insertId;
  },

  update: async (id, { name, code, full_marks, pass_marks, is_optional }) => {
    const [result] = await db.query(
      `UPDATE subjects
       SET name=?, code=?, full_marks=?, pass_marks=?, is_optional=?
       WHERE id=?`,
      [name, code.toUpperCase(), full_marks || 100,
       pass_marks || 40, is_optional || 0, id]
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    // Check if marks exist for this subject
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM marks WHERE subject_id = ?',
      [id]
    );
    if (count > 0) {
      throw new Error(
        `Cannot delete — ${count} mark record(s) exist for this subject`
      );
    }
    const [result] = await db.query(
      'DELETE FROM subjects WHERE id = ?', [id]
    );
    return result.affectedRows;
  },

  codeExists: async (code, classId, excludeId = null) => {
    let query = 'SELECT id FROM subjects WHERE code = ? AND class_id = ?';
    const params = [code.toUpperCase(), classId];
    if (excludeId) { query += ' AND id != ?'; params.push(excludeId); }
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  }

};

module.exports = SubjectModel;