const db = require('../config/db');

const AuthModel = {

  // Find admin by email
  findByEmail: async (email) => {
    const [rows] = await db.query(
      'SELECT * FROM admins WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  // Find admin by ID (used to load profile)
  findById: async (id) => {
    const [rows] = await db.query(
      'SELECT id, name, email, created_at FROM admins WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

};

module.exports = AuthModel;