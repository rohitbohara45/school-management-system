const db = require('../config/db');

const PromotionModel = {

    // Get promotion history for a student
    getByStudent: async (studentId) => {
        const [rows] = await db.query(`
      SELECT
        ph.*,
        fc.name    AS from_class_name,
        fc.section AS from_class_section,
        tc.name    AS to_class_name,
        tc.section AS to_class_section,
        a.name     AS promoted_by_name
      FROM promotion_history ph
      JOIN classes fc ON ph.from_class_id = fc.id
      JOIN classes tc ON ph.to_class_id   = tc.id
      JOIN admins  a  ON ph.promoted_by   = a.id
      WHERE ph.student_id = ?
      ORDER BY ph.promoted_at DESC
    `, [studentId]);
        return rows;
    },

    // Get all promotions for a year
    getByYear: async (fromYear) => {
        const [rows] = await db.query(`
      SELECT
        ph.*,
        s.name     AS student_name,
        fc.name    AS from_class_name,
        fc.section AS from_class_section,
        tc.name    AS to_class_name,
        tc.section AS to_class_section
      FROM promotion_history ph
      JOIN students s  ON ph.student_id    = s.id
      JOIN classes fc  ON ph.from_class_id = fc.id
      JOIN classes tc  ON ph.to_class_id   = tc.id
      WHERE ph.from_year = ?
      ORDER BY ph.promoted_at DESC
    `, [fromYear]);
        return rows;
    },

    // Promote a single student
    promoteStudent: async ({
        student_id, from_class_id, to_class_id,
        from_year, to_year, promoted_by
    }) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            // Record history
            await conn.query(
                `INSERT INTO promotion_history
           (student_id, from_class_id, to_class_id,
            from_year, to_year, promoted_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [student_id, from_class_id, to_class_id,
                    from_year, to_year, promoted_by]
            );

            // Move student to new class
            await conn.query(
                `UPDATE students
         SET class_id = ?, academic_year = ?
         WHERE id = ?`,
                [to_class_id, to_year, student_id]
            );

            await conn.commit();
            return true;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    // Bulk promote entire class to another class
    promoteClass: async ({
        from_class_id, to_class_id,
        from_year, to_year, promoted_by
    }) => {
        // Get all active students in the from_class
        const [students] = await db.query(
            'SELECT id FROM students WHERE class_id = ? AND is_active = 1',
            [from_class_id]
        );

        if (!students.length) return { promoted: 0 };

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            for (const student of students) {
                // Record history
                await conn.query(
                    `INSERT INTO promotion_history
             (student_id, from_class_id, to_class_id,
              from_year, to_year, promoted_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [student.id, from_class_id, to_class_id,
                        from_year, to_year, promoted_by]
                );

                // Move student
                await conn.query(
                    'UPDATE students SET class_id = ?, academic_year = ? WHERE id = ?',
                    [to_class_id, to_year, student.id]
                );
            }

            await conn.commit();
            return { promoted: students.length };
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    // Get students eligible for promotion (in a class)
    getEligibleStudents: async (classId) => {
        const [rows] = await db.query(`
      SELECT
        s.id, s.name, s.email, s.academic_year,
        c.name AS class_name, c.section,
        COUNT(DISTINCT a.att_date) AS total_days,
        SUM(a.status = 'present')  AS present_days,
        ROUND(
          (SUM(a.status = 'present') /
           NULLIF(COUNT(DISTINCT a.att_date), 0)) * 100
        , 1) AS attendance_pct
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendance a ON a.student_id = s.id
      WHERE s.class_id = ? AND s.is_active = 1
      GROUP BY s.id
      ORDER BY s.name
    `, [classId]);
        return rows;
    }

};

module.exports = PromotionModel;