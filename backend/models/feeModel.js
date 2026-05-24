const db = require('../config/db');

const FeeModel = {

    getAll: async (filters = {}) => {
        let query = `
      SELECT
        f.*,
        s.name       AS student_name,
        s.email      AS student_email,
        c.name       AS class_name,
        c.section    AS class_section
      FROM fees f
      JOIN students s ON f.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
        const params = [];

        if (filters.student_id) {
            query += ' AND f.student_id = ?';
            params.push(filters.student_id);
        }
        if (filters.status) {
            query += ' AND f.status = ?';
            params.push(filters.status);
        }
        if (filters.class_id) {
            query += ' AND s.class_id = ?';
            params.push(filters.class_id);
        }
        if (filters.year) {
            query += ' AND f.academic_year = ?';
            params.push(filters.year);
        }
        if (filters.month) {
            query += ' AND f.month = ?';
            params.push(filters.month);
        }

        query += ' ORDER BY f.academic_year DESC, f.created_at DESC';
        const [rows] = await db.query(query, params);
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(`
      SELECT f.*, s.name AS student_name, s.email AS student_email,
             c.name AS class_name, c.section AS class_section
      FROM fees f
      JOIN students s ON f.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE f.id = ?
    `, [id]);
        return rows[0] || null;
    },

    getSummary: async (year = null) => {
        const currentYear = year || new Date().getFullYear();
        const [[summary]] = await db.query(`
      SELECT
        COUNT(*)                          AS total,
        SUM(status = 'paid')              AS paid,
        SUM(status = 'due')               AS due,
        SUM(CASE WHEN status='paid'
            THEN amount ELSE 0 END)       AS total_collected,
        SUM(CASE WHEN status='due'
            THEN amount ELSE 0 END)       AS total_due
      FROM fees
      WHERE academic_year = ?
    `, [currentYear]);
        return { ...summary, year: currentYear };
    },

    create: async ({ student_id, month, academic_year, amount, status, paid_date }) => {
        // Generate receipt number
        const receipt_no = status === 'paid'
            ? `RCP-${Date.now().toString().slice(-8)}`
            : null;

        const [result] = await db.query(
            `INSERT INTO fees
         (student_id, month, academic_year, amount, status, paid_date, receipt_no)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [student_id, month,
                academic_year || new Date().getFullYear(),
                amount, status || 'due',
                status === 'paid' ? (paid_date || new Date().toISOString().split('T')[0]) : null,
                receipt_no]
        );
        return result.insertId;
    },

    update: async (id, { status, amount, paid_date, month }) => {
        // Generate receipt if marking as paid
        const existing = await FeeModel.getById(id);
        const receipt_no = status === 'paid' && existing.status !== 'paid'
            ? `RCP-${Date.now().toString().slice(-8)}`
            : existing.receipt_no;

        const [result] = await db.query(
            `UPDATE fees
       SET status=?, amount=?, month=?,
           paid_date=?, receipt_no=?
       WHERE id=?`,
            [status, amount, month,
                status === 'paid' ? (paid_date || new Date().toISOString().split('T')[0]) : null,
                receipt_no, id]
        );
        return result.affectedRows;
    },

    delete: async (id) => {
        const [result] = await db.query('DELETE FROM fees WHERE id = ?', [id]);
        return result.affectedRows;
    },

    // Bulk create fees for all students in a class
    bulkCreate: async (classId, month, year, amount) => {
        const [students] = await db.query(
            'SELECT id FROM students WHERE class_id = ? AND is_active = 1',
            [classId]
        );

        let created = 0;
        let skipped = 0;

        for (const student of students) {
            try {
                await FeeModel.create({
                    student_id: student.id,
                    month,
                    academic_year: year,
                    amount,
                    status: 'due'
                });
                created++;
            } catch (err) {
                // Skip if already exists (duplicate key)
                if (err.code === 'ER_DUP_ENTRY') skipped++;
                else throw err;
            }
        }

        return { created, skipped };
    }

};

module.exports = FeeModel;