const db = require('../config/db');

const TeacherModel = {

  getAll: async () => {
    const [rows] = await db.query(`
      SELECT 
        t.*,
        COUNT(c.id) AS class_count
      FROM teachers t
      LEFT JOIN classes c ON c.teacher_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      'SELECT * FROM teachers WHERE id = ?', [id]
    );
    return rows[0] || null;
  },

  create: async ({ name, email, phone, subject }) => {
    const [result] = await db.query(
      `INSERT INTO teachers (name, email, phone, subject)
       VALUES (?, ?, ?, ?)`,
      [name, email || null, phone || null, subject || null]
    );
    return result.insertId;
  },

  update: async (id, { name, email, phone, subject }) => {
    const [result] = await db.query(
      `UPDATE teachers SET name=?, email=?, phone=?, subject=? WHERE id=?`,
      [name, email || null, phone || null, subject || null, id]
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await db.query(
      'DELETE FROM teachers WHERE id = ?', [id]
    );
    return result.affectedRows;
  },

  emailExists: async (email, excludeId = null) => {
    let query = 'SELECT id FROM teachers WHERE email = ?';
    const params = [email];
    if (excludeId) { query += ' AND id != ?'; params.push(excludeId); }
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  }

};

module.exports = TeacherModel;