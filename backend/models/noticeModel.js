const db = require('../config/db');

const NoticeModel = {

    getAll: async (category = null, activeOnly = true) => {
        let query = `
      SELECT
        n.*,
        a.name AS posted_by
      FROM notices n
      JOIN admins a ON n.admin_id = a.id
      WHERE 1=1
    `;
        const params = [];
        if (activeOnly) { query += ' AND n.is_active = 1'; }
        if (category) { query += ' AND n.category = ?'; params.push(category); }
        query += ' ORDER BY n.posted_date DESC, n.created_at DESC';
        const [rows] = await db.query(query, params);
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(`
      SELECT n.*, a.name AS posted_by
      FROM notices n
      JOIN admins a ON n.admin_id = a.id
      WHERE n.id = ?
    `, [id]);
        return rows[0] || null;
    },

    create: async ({ title, content, category, admin_id, posted_date }) => {
        const [result] = await db.query(
            `INSERT INTO notices (title, content, category, admin_id, posted_date)
       VALUES (?, ?, ?, ?, ?)`,
            [title, content, category || 'general',
                admin_id, posted_date || new Date().toISOString().split('T')[0]]
        );
        return result.insertId;
    },

    update: async (id, { title, content, category, posted_date, is_active }) => {
        const [result] = await db.query(
            `UPDATE notices
       SET title=?, content=?, category=?, posted_date=?, is_active=?
       WHERE id=?`,
            [title, content, category || 'general',
                posted_date, is_active ?? 1, id]
        );
        return result.affectedRows;
    },

    delete: async (id) => {
        const [result] = await db.query('DELETE FROM notices WHERE id = ?', [id]);
        return result.affectedRows;
    }

};

module.exports = NoticeModel;