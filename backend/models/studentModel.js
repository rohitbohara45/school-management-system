const db = require('../config/db');

const StudentModel = {

  getAll: async ({ page = 1, limit = 10, search = '' } = {}) => {
    const offset      = (page - 1) * limit;
    const searchParam = `%${search}%`;

    const [rows] = await db.query(`
      SELECT
        s.id, s.name, s.email, s.phone, s.dob,
        s.parent_name, s.address, s.photo_url,
        s.admission_date, s.academic_year, s.is_active,
        s.created_at,
        c.name    AS class_name,
        c.section AS class_section,
        s.class_id
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE (s.name LIKE ? OR s.email LIKE ?)
      AND s.is_active = 1
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, [searchParam, searchParam,
        parseInt(limit), parseInt(offset)]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM students
       WHERE (name LIKE ? OR email LIKE ?) AND is_active = 1`,
      [searchParam, searchParam]
    );

    return {
      data: rows,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  getById: async (id) => {
    const [rows] = await db.query(`
      SELECT
        s.*,
        c.name    AS class_name,
        c.section AS class_section
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `, [id]);
    return rows[0] || null;
  },

  create: async ({ name, email, phone, dob, class_id,
                   parent_name, address, admission_date, academic_year }) => {
    const [result] = await db.query(
      `INSERT INTO students
         (name, email, phone, dob, class_id,
          parent_name, address, admission_date, academic_year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name,
       email        || null,
       phone        || null,
       dob          || null,
       class_id     || null,
       parent_name  || null,
       address      || null,
       admission_date || null,
       academic_year  || new Date().getFullYear()]
    );
    return result.insertId;
  },

  update: async (id, { name, email, phone, dob, class_id,
                        parent_name, address, admission_date }) => {
    const [result] = await db.query(
      `UPDATE students
       SET name=?, email=?, phone=?, dob=?,
           class_id=?, parent_name=?, address=?, admission_date=?
       WHERE id=?`,
      [name,
       email        || null,
       phone        || null,
       dob          || null,
       class_id     || null,
       parent_name  || null,
       address      || null,
       admission_date || null,
       id]
    );
    return result.affectedRows;
  },

  updatePhoto: async (id, photoUrl) => {
    await db.query(
      'UPDATE students SET photo_url = ? WHERE id = ?',
      [photoUrl, id]
    );
  },

  delete: async (id) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM marks      WHERE student_id = ?', [id]);
      await conn.query('DELETE FROM attendance WHERE student_id = ?', [id]);
      await conn.query('DELETE FROM fees       WHERE student_id = ?', [id]);
      await conn.query('DELETE FROM student_users WHERE student_id = ?', [id]);
      await conn.query('DELETE FROM students   WHERE id = ?', [id]);
      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  emailExists: async (email, excludeId = null) => {
    let query  = 'SELECT id FROM students WHERE email = ?';
    const params = [email];
    if (excludeId) { query += ' AND id != ?'; params.push(excludeId); }
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },

  // Full profile — for student profile page
  getFullProfile: async (id) => {
    const student = await StudentModel.getById(id);
    if (!student) return null;

    // Recent attendance
    const [attendance] = await db.query(`
      SELECT att_date, status FROM attendance
      WHERE student_id = ?
      ORDER BY att_date DESC LIMIT 30
    `, [id]);

    // Attendance summary
    const [[attSummary]] = await db.query(`
      SELECT
        COUNT(*)                AS total,
        SUM(status='present')   AS present,
        SUM(status='absent')    AS absent,
        SUM(status='late')      AS late
      FROM attendance WHERE student_id = ?
    `, [id]);

    const attPct = attSummary.total > 0
      ? Math.round((attSummary.present / attSummary.total) * 100) : 0;

    // Recent marks grouped by exam
    const [marks] = await db.query(`
      SELECT
        m.*,
        s.name  AS subject_name,
        s.code  AS subject_code,
        e.name  AS exam_name,
        e.type  AS exam_type,
        ROUND((m.marks_obtained / m.full_marks) * 100, 1) AS percentage
      FROM marks m
      JOIN subjects s ON m.subject_id = s.id
      JOIN exams    e ON m.exam_id    = e.id
      WHERE m.student_id = ?
      ORDER BY e.exam_date DESC, s.name
    `, [id]);

    // Fee summary
    const [fees] = await db.query(`
      SELECT * FROM fees
      WHERE student_id = ?
      ORDER BY academic_year DESC, month DESC
    `, [id]);

    const feeSummary = {
      total: fees.length,
      paid:  fees.filter(f => f.status === 'paid').length,
      due:   fees.filter(f => f.status === 'due').length,
      dueAmount: fees
        .filter(f => f.status === 'due')
        .reduce((s, f) => s + parseFloat(f.amount), 0)
    };

    return {
      student,
      attendance,
      attSummary: { ...attSummary, percentage: attPct },
      marks,
      fees,
      feeSummary
    };
  }

};

module.exports = StudentModel;