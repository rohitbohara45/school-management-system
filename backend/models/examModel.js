const db = require('../config/db');

const ExamModel = {

  getAll: async (classId = null, year = null) => {
    let query = `
      SELECT
        e.*,
        c.name    AS class_name,
        c.section AS class_section,
        COUNT(DISTINCT m.student_id) AS students_marked
      FROM exams e
      JOIN classes c ON e.class_id = c.id
      LEFT JOIN marks m ON m.exam_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (classId) { query += ' AND e.class_id = ?';      params.push(classId); }
    if (year)    { query += ' AND e.academic_year = ?';  params.push(year); }
    query += ' GROUP BY e.id ORDER BY e.exam_date DESC, e.created_at DESC';
    const [rows] = await db.query(query, params);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(`
      SELECT e.*, c.name AS class_name, c.section AS class_section
      FROM exams e
      JOIN classes c ON e.class_id = c.id
      WHERE e.id = ?
    `, [id]);
    return rows[0] || null;
  },

  create: async ({ name, type, class_id, academic_year, exam_date, description }) => {
    const [result] = await db.query(
      `INSERT INTO exams (name, type, class_id, academic_year, exam_date, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type || 'other', class_id,
       academic_year || new Date().getFullYear(),
       exam_date || null, description || null]
    );
    return result.insertId;
  },

  update: async (id, { name, type, exam_date, description }) => {
    const [result] = await db.query(
      `UPDATE exams SET name=?, type=?, exam_date=?, description=? WHERE id=?`,
      [name, type || 'other', exam_date || null, description || null, id]
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM marks WHERE exam_id = ?', [id]
    );
    if (count > 0) {
      throw new Error(`Cannot delete — ${count} mark record(s) exist for this exam`);
    }
    const [result] = await db.query('DELETE FROM exams WHERE id = ?', [id]);
    return result.affectedRows;
  },

  // Get marks entry sheet — all students in class with all subjects
  getMarksSheet: async (examId) => {
    const exam = await ExamModel.getById(examId);
    if (!exam) return null;

    // Get all subjects for this class
    const [subjects] = await db.query(
      'SELECT * FROM subjects WHERE class_id = ? ORDER BY is_optional, name',
      [exam.class_id]
    );

    // Get all students in this class
    const [students] = await db.query(
      'SELECT id, name FROM students WHERE class_id = ? AND is_active = 1 ORDER BY name',
      [exam.class_id]
    );

    // Get existing marks
    const [existingMarks] = await db.query(
      `SELECT m.*, s.name AS subject_name
       FROM marks m
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.exam_id = ?`,
      [examId]
    );

    // Build marks map for quick lookup
    const marksMap = {};
    existingMarks.forEach(m => {
      const key = `${m.student_id}_${m.subject_id}`;
      marksMap[key] = m;
    });

    return { exam, subjects, students, marksMap };
  },

  // Save marks for entire class at once
  saveMarks: async (examId, marksData) => {
    // marksData = [{ student_id, subject_id, marks_obtained, full_marks, is_absent, teacher_remark }]
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      for (const m of marksData) {
        await conn.query(
          `INSERT INTO marks
             (student_id, exam_id, subject_id, marks_obtained, full_marks, is_absent, teacher_remark)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             marks_obtained  = VALUES(marks_obtained),
             full_marks      = VALUES(full_marks),
             is_absent       = VALUES(is_absent),
             teacher_remark  = VALUES(teacher_remark)`,
          [m.student_id, examId, m.subject_id,
           m.marks_obtained || 0, m.full_marks || 100,
           m.is_absent || 0, m.teacher_remark || null]
        );
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // Get result for one student in one exam
  getStudentResult: async (studentId, examId) => {
    const [marks] = await db.query(`
      SELECT
        m.*,
        s.name       AS subject_name,
        s.code       AS subject_code,
        s.pass_marks AS subject_pass_marks,
        s.is_optional
      FROM marks m
      JOIN subjects s ON m.subject_id = s.id
      WHERE m.student_id = ? AND m.exam_id = ?
      ORDER BY s.is_optional, s.name
    `, [studentId, examId]);

    if (!marks.length) return null;

    // Calculate totals (exclude absent subjects)
    const counted     = marks.filter(m => !m.is_absent);
    const totalObtained = counted.reduce((s, m) => s + m.marks_obtained, 0);
    const totalFull     = counted.reduce((s, m) => s + m.full_marks, 0);
    const percentage    = totalFull > 0
      ? Math.round((totalObtained / totalFull) * 100 * 10) / 10 : 0;

    // Check if failed any subject
    const failedSubjects = counted.filter(
      m => m.marks_obtained < m.subject_pass_marks
    );

    // Division
    let division;
    if (failedSubjects.length > 0 || marks.some(m => m.is_absent)) {
      division = 'Fail';
    } else if (percentage >= 80) {
      division = 'Distinction';
    } else if (percentage >= 60) {
      division = 'First Division';
    } else if (percentage >= 40) {
      division = 'Second Division';
    } else {
      division = 'Fail';
    }

    return {
      marks,
      totalObtained,
      totalFull,
      percentage,
      division,
      failedSubjects: failedSubjects.map(m => m.subject_name)
    };
  },

  // Get full class result for one exam
  getClassResult: async (examId) => {
    const exam = await ExamModel.getById(examId);
    if (!exam) return null;

    const [students] = await db.query(
      'SELECT id, name FROM students WHERE class_id = ? AND is_active = 1 ORDER BY name',
      [exam.class_id]
    );

    const results = [];
    for (const student of students) {
      const result = await ExamModel.getStudentResult(student.id, examId);
      if (result) {
        results.push({ student, ...result });
      }
    }

    // Sort by percentage descending and assign rank
    results.sort((a, b) => b.percentage - a.percentage);
    results.forEach((r, i) => { r.rank = i + 1; });

    return { exam, results };
  }

};

module.exports = ExamModel;