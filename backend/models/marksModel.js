const db = require('../config/db');

const MarksModel = {

  getByStudent: async (studentId) => {
    const [rows] = await db.query(`
      SELECT * FROM marks
      WHERE student_id = ?
      ORDER BY term, subject
    `, [studentId]);
    return rows;
  },

 getAll: async (filters = {}) => {
  let query = `
    SELECT
      m.*,
      s.name AS student_name,
      c.name AS class_name,
      c.section,
      ROUND((m.marks_obtained / m.total_marks) * 100, 1) AS percentage,
      CASE
        WHEN (m.marks_obtained / m.total_marks) >= 0.90 THEN 'A+'
        WHEN (m.marks_obtained / m.total_marks) >= 0.80 THEN 'A'
        WHEN (m.marks_obtained / m.total_marks) >= 0.70 THEN 'B'
        WHEN (m.marks_obtained / m.total_marks) >= 0.60 THEN 'C'
        WHEN (m.marks_obtained / m.total_marks) >= 0.50 THEN 'D'
        ELSE 'F'
      END AS grade
    FROM marks m
    JOIN students s ON m.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (filters.class_id) { query += ' AND s.class_id = ?'; params.push(filters.class_id); }
  if (filters.term)     { query += ' AND m.term = ?';     params.push(filters.term); }
  query += ' ORDER BY s.name, m.subject';
  const [rows] = await db.query(query, params);
  return rows;
},

  create: async ({ student_id, subject, marks_obtained, total_marks, term }) => {
    const [result] = await db.query(
      `INSERT INTO marks (student_id, subject, marks_obtained, total_marks, term)
       VALUES (?, ?, ?, ?, ?)`,
      [student_id, subject, marks_obtained, total_marks || 100, term || 'Term 1']
    );
    return result.insertId;
  },

  update: async (id, { subject, marks_obtained, total_marks, term }) => {
    const [result] = await db.query(
      `UPDATE marks SET subject=?, marks_obtained=?, total_marks=?, term=? WHERE id=?`,
      [subject, marks_obtained, total_marks || 100, term || 'Term 1', id]
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await db.query('DELETE FROM marks WHERE id = ?', [id]);
    return result.affectedRows;
  },

  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM marks WHERE id = ?', [id]);
    return rows[0] || null;
  }

};

module.exports = MarksModel;