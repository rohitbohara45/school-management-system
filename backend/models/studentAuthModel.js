const db = require('../config/db');

const StudentAuthModel = {

  // Find student login account by email
  findByEmail: async (email) => {
    const [rows] = await db.query(
      `SELECT
         su.*,
         s.name,
         s.class_id,
         c.name    AS class_name,
         c.section AS class_section
       FROM student_users su
       JOIN students s ON su.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE su.email = ? AND su.is_active = 1`,
      [email]
    );
    return rows[0] || null;
  },

  // Find by student_user id
  findById: async (id) => {
    const [rows] = await db.query(
      `SELECT
         su.id,
         su.student_id,
         su.email,
         su.is_active,
         s.name,
         s.phone,
         s.dob,
         c.name    AS class_name,
         c.section AS class_section
       FROM student_users su
       JOIN students s ON su.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE su.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  // Create a student login account (admin creates these)
  create: async (student_id, email, password_hash) => {
    const [result] = await db.query(
      `INSERT INTO student_users (student_id, email, password_hash)
       VALUES (?, ?, ?)`,
      [student_id, email, password_hash]
    );
    return result.insertId;
  },

  // Change password
  updatePassword: async (id, newHash) => {
    await db.query(
      'UPDATE student_users SET password_hash = ? WHERE id = ?',
      [newHash, id]
    );
  }

};

module.exports = StudentAuthModel;