const express     = require('express');
const router      = express.Router();
const PDFDocument = require('pdfkit');
const path        = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db             = require('../config/db');
const { sendMail }   = require('../config/mailer');
const { protect }    = require('../middleware/auth');
const ExamModel      = require('../models/examModel');

// ── Helper: division color ────────────────────────────────────
function divisionColor(division) {
  if (division === 'Distinction')    return '#7c3aed';
  if (division === 'First Division') return '#16a34a';
  if (division === 'Second Division') return '#d97706';
  return '#dc2626';
}

// ── Helper: get full student data for report card ─────────────
async function getReportCardData(studentId, examId) {
  // Student info
  const [[student]] = await db.query(`
    SELECT s.*, c.name AS class_name, c.section AS class_section
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `, [studentId]);

  if (!student) return null;

  // Exam info
  const exam = await ExamModel.getById(examId);
  if (!exam) return null;

  // Result with marks
  const result = await ExamModel.getStudentResult(studentId, examId);
  if (!result) return null;

  // Attendance summary
  const [[attendance]] = await db.query(`
    SELECT
      COUNT(*)                  AS total,
      SUM(status = 'present')   AS present,
      SUM(status = 'absent')    AS absent,
      SUM(status = 'late')      AS late
    FROM attendance WHERE student_id = ?
  `, [studentId]);

  const attPct = attendance.total > 0
    ? Math.round((attendance.present / attendance.total) * 100) : 0;

  return { student, exam, result, attendance, attPct };
}

// ── GET /api/reports/report-card/:studentId/:examId ───────────
router.get('/report-card/:studentId/:examId', protect, async (req, res) => {
  try {
    const data = await getReportCardData(
      req.params.studentId,
      req.params.examId
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Student, exam or marks not found'
      });
    }

    const { student, exam, result, attendance, attPct } = data;
    const { marks, totalObtained, totalFull, percentage, division, failedSubjects } = result;

    const doc = new PDFDocument({ margin: 45, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-card-${student.name.replace(/\s+/g, '-')}-${exam.name.replace(/\s+/g, '-')}.pdf"`
    );
    doc.pipe(res);

    const W = 595 - 90; // page width minus margins

    // ── School header ─────────────────────────────────────────
    doc.rect(0, 0, 595, 110).fill('#1e2a3a');

    doc.fillColor('#ffffff')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('SchoolMS', 45, 22);

    doc.fillColor('#94a3b8')
       .fontSize(10)
       .font('Helvetica')
       .text('School Management System', 45, 50);

    doc.fillColor('#64748b')
       .fontSize(9)
       .text('Kathmandu, Nepal | schoolms@school.com', 45, 66);

    // Report card label (right side of header)
    doc.rect(400, 18, 150, 74).fill('#2563eb');
    doc.fillColor('#ffffff')
       .fontSize(13)
       .font('Helvetica-Bold')
       .text('REPORT CARD', 400, 30, { width: 150, align: 'center' });
    doc.fillColor('#bfdbfe')
       .fontSize(9)
       .font('Helvetica')
       .text(exam.name, 400, 52, { width: 150, align: 'center' });
    doc.fillColor('#93c5fd')
       .fontSize(8)
       .text(`Academic Year ${exam.academic_year}`, 400, 68, { width: 150, align: 'center' });

    // ── Student info band ─────────────────────────────────────
    let y = 125;

    doc.rect(45, y, W, 70).fill('#f8fafc').stroke('#e2e8f0');

    doc.fillColor('#1e2a3a')
       .fontSize(15)
       .font('Helvetica-Bold')
       .text(student.name, 58, y + 10);

    doc.fillColor('#64748b')
       .fontSize(9)
       .font('Helvetica');

    const col1 = 58;
    const col2 = 280;
    const infoY = y + 32;
    const lineH = 14;

    doc.text('Class:', col1, infoY)
       .fillColor('#1e2a3a')
       .text(`${student.class_name || '—'} — Section ${student.class_section || '—'}`,
             col1 + 40, infoY);

    doc.fillColor('#64748b')
       .text('Exam Date:', col1, infoY + lineH)
       .fillColor('#1e2a3a')
       .text(exam.exam_date
         ? new Date(exam.exam_date).toLocaleDateString('en-GB', {
             day: 'numeric', month: 'long', year: 'numeric'
           })
         : '—',
         col1 + 60, infoY + lineH);

    doc.fillColor('#64748b')
       .text('Roll No:', col2, infoY)
       .fillColor('#1e2a3a')
       .text(String(student.id).padStart(4, '0'), col2 + 46, infoY);

    doc.fillColor('#64748b')
       .text('Admission:', col2, infoY + lineH)
       .fillColor('#1e2a3a')
       .text(student.admission_date
         ? new Date(student.admission_date).toLocaleDateString('en-GB')
         : '—',
         col2 + 56, infoY + lineH);

    // ── Marks table ───────────────────────────────────────────
    y = 215;

    doc.fillColor('#1e2a3a')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Academic Performance', 45, y);

    y += 16;

    // Table header
    const cols = {
      sno:     { x: 45,  w: 28  },
      subject: { x: 73,  w: 160 },
      full:    { x: 233, w: 60  },
      pass:    { x: 293, w: 60  },
      obtained:{ x: 353, w: 65  },
      percent: { x: 418, w: 55  },
      result:  { x: 473, w: 50  },
      remark:  { x: 523, w: 27  }
    };

    doc.rect(45, y, W, 22).fill('#1e2a3a');
    doc.fillColor('#ffffff')
       .fontSize(8)
       .font('Helvetica-Bold');

    doc.text('S.N', cols.sno.x + 4,     y + 7)
       .text('Subject',   cols.subject.x + 4, y + 7)
       .text('F.M',       cols.full.x + 4,    y + 7)
       .text('P.M',       cols.pass.x + 4,    y + 7)
       .text('Obtained',  cols.obtained.x + 2,y + 7)
       .text('%',         cols.percent.x + 4, y + 7)
       .text('Result',    cols.result.x + 4,  y + 7);

    y += 22;

    marks.forEach((m, i) => {
      const rowBg  = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      const isPassed = !m.is_absent && m.marks_obtained >= m.subject_pass_marks;
      const subPct = m.is_absent ? 0
        : Math.round((m.marks_obtained / m.full_marks) * 100);

      doc.rect(45, y, W, 20).fill(rowBg);

      doc.fillColor('#374151')
         .fontSize(8.5)
         .font('Helvetica');

      doc.text(String(i + 1),            cols.sno.x + 4,      y + 6)
         .text(m.subject_name,           cols.subject.x + 4,  y + 6)
         .text(String(m.full_marks),     cols.full.x + 4,     y + 6)
         .text(String(m.subject_pass_marks), cols.pass.x + 4, y + 6);

      if (m.is_absent) {
        doc.fillColor('#dc2626')
           .font('Helvetica-Bold')
           .text('ABSENT', cols.obtained.x + 4, y + 6);
      } else {
        doc.fillColor(isPassed ? '#374151' : '#dc2626')
           .font(isPassed ? 'Helvetica' : 'Helvetica-Bold')
           .text(String(m.marks_obtained), cols.obtained.x + 4, y + 6);
      }

      doc.fillColor('#374151')
         .font('Helvetica')
         .text(m.is_absent ? '—' : `${subPct}%`, cols.percent.x + 4, y + 6);

      // Pass/Fail badge
      doc.rect(cols.result.x + 2, y + 4, 44, 14)
         .fill(isPassed && !m.is_absent ? '#f0fdf4' : '#fff5f5');
      doc.fillColor(isPassed && !m.is_absent ? '#16a34a' : '#dc2626')
         .font('Helvetica-Bold')
         .fontSize(7.5)
         .text(
           m.is_absent ? 'ABSENT' : (isPassed ? 'PASS' : 'FAIL'),
           cols.result.x + 2, y + 7,
           { width: 44, align: 'center' }
         );

      // Row border
      doc.rect(45, y, W, 20).stroke('#e8ecf0');
      y += 20;

      // Page break guard
      if (y > 700) { doc.addPage(); y = 45; }
    });

    // ── Totals row ────────────────────────────────────────────
    doc.rect(45, y, W, 24).fill('#1e2a3a');
    doc.fillColor('#ffffff')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('TOTAL', cols.subject.x + 4, y + 8)
       .text(String(totalFull),     cols.full.x + 4,     y + 8)
       .text('—',                   cols.pass.x + 4,     y + 8)
       .text(String(totalObtained), cols.obtained.x + 4, y + 8)
       .text(`${percentage}%`,      cols.percent.x + 4,  y + 8);

    y += 34;

    // ── Result summary ────────────────────────────────────────
    // Division box
    doc.rect(45, y, 200, 60).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#64748b')
       .fontSize(8)
       .font('Helvetica')
       .text('DIVISION', 55, y + 8);
    doc.fillColor(divisionColor(division))
       .fontSize(20)
       .font('Helvetica-Bold')
       .text(division, 55, y + 22);

    // Percentage box
    doc.rect(255, y, 120, 60).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#64748b')
       .fontSize(8)
       .font('Helvetica')
       .text('PERCENTAGE', 265, y + 8);
    doc.fillColor('#2563eb')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text(`${percentage}%`, 265, y + 22);

    // Attendance box
    doc.rect(385, y, 160, 60).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#64748b')
       .fontSize(8)
       .font('Helvetica')
       .text('ATTENDANCE', 395, y + 8);
    doc.fillColor(attPct >= 75 ? '#16a34a' : '#dc2626')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text(`${attPct}%`, 395, y + 22);
    doc.fillColor('#64748b')
       .fontSize(8)
       .font('Helvetica')
       .text(`${attendance.present || 0} / ${attendance.total || 0} days`,
             395, y + 44);

    y += 72;

    // Failed subjects warning
    if (failedSubjects.length > 0) {
      doc.rect(45, y, W, 24).fill('#fff5f5').stroke('#fecaca');
      doc.fillColor('#dc2626')
         .fontSize(8.5)
         .font('Helvetica-Bold')
         .text(
           `Failed in: ${failedSubjects.join(', ')}`,
           55, y + 8
         );
      y += 32;
    }

    // ── Teacher remarks ───────────────────────────────────────
    y += 8;
    doc.fillColor('#1e2a3a')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Teacher Remarks', 45, y);
    y += 14;

    // Get unique remarks from marks
    const remarks = marks
      .filter(m => m.teacher_remark)
      .map(m => `${m.subject_name}: ${m.teacher_remark}`);

    if (remarks.length) {
      remarks.forEach(r => {
        doc.fillColor('#374151')
           .fontSize(9)
           .font('Helvetica')
           .text(`• ${r}`, 50, y);
        y += 14;
      });
    } else {
      doc.rect(45, y, W, 22).fill('#f8fafc').stroke('#e2e8f0');
      doc.fillColor('#94a3b8')
         .fontSize(9)
         .font('Helvetica-Oblique')
         .text('No remarks added.', 55, y + 7);
      y += 30;
    }

    // ── Signature lines ───────────────────────────────────────
    y = Math.max(y + 20, 660);

    doc.moveTo(55,  y).lineTo(175, y).stroke('#94a3b8');
    doc.moveTo(225, y).lineTo(345, y).stroke('#94a3b8');
    doc.moveTo(395, y).lineTo(510, y).stroke('#94a3b8');

    doc.fillColor('#64748b')
       .fontSize(8)
       .font('Helvetica')
       .text('Class Teacher',    55,  y + 4)
       .text('Principal',        225, y + 4)
       .text("Parent's Signature", 395, y + 4);

    // ── Footer ────────────────────────────────────────────────
    doc.rect(0, 790, 595, 52).fill('#f8fafc');
    doc.moveTo(0, 790).lineTo(595, 790).stroke('#e2e8f0');

    doc.fillColor('#94a3b8')
       .fontSize(8)
       .text(
         `Generated by SchoolMS on ${new Date().toLocaleDateString('en-GB', {
           day: 'numeric', month: 'long', year: 'numeric'
         })}`,
         45, 800
       )
       .text('This is a computer-generated document.', 45, 812);

    doc.fillColor('#2563eb')
       .text('SchoolMS', 500, 800);

    doc.end();

  } catch (err) {
    console.error('Report card error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false, message: 'Failed to generate report card'
      });
    }
  }
});

// ── GET /api/reports/pdf/:studentId (old endpoint — keep working) ─
router.get('/pdf/:studentId', protect, async (req, res) => {
  try {
    // Get most recent exam for this student's class
    const [[student]] = await db.query(
      'SELECT class_id FROM students WHERE id = ?',
      [req.params.studentId]
    );
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const [exams] = await db.query(
      `SELECT id FROM exams WHERE class_id = ?
       ORDER BY created_at DESC LIMIT 1`,
      [student.class_id]
    );

    if (!exams.length) {
      return res.status(404).json({
        success: false,
        message: 'No exams found for this student\'s class'
      });
    }

    // Redirect to new endpoint
    res.redirect(`/api/reports/report-card/${req.params.studentId}/${exams[0].id}`);

  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

// ── POST /api/reports/email/:studentId/:examId ────────────────
router.post('/email/:studentId/:examId', protect, async (req, res) => {
  try {
    const data = await getReportCardData(
      req.params.studentId,
      req.params.examId
    );

    if (!data) {
      return res.status(404).json({
        success: false, message: 'Student, exam or marks not found'
      });
    }

    const { student, exam, result, attPct } = data;
    const { marks, totalObtained, totalFull, percentage, division } = result;

    if (!student.email) {
      return res.status(400).json({
        success: false, message: 'Student has no email address'
      });
    }

    const marksRows = marks.map(m => {
      const isPassed = !m.is_absent && m.marks_obtained >= m.subject_pass_marks;
      const pct = m.is_absent ? '—'
        : Math.round((m.marks_obtained / m.full_marks) * 100) + '%';
      return `
        <tr style="background:${isPassed ? '#fff' : '#fff5f5'}">
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${m.subject_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${m.full_marks}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${m.subject_pass_marks}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;
              color:${isPassed ? '#374151' : '#dc2626'};font-weight:${isPassed ? '400' : '700'};">
            ${m.is_absent ? 'ABSENT' : m.marks_obtained}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${pct}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;
              font-weight:700;color:${isPassed ? '#16a34a' : '#dc2626'};">
            ${m.is_absent ? 'ABSENT' : (isPassed ? 'PASS' : 'FAIL')}
          </td>
        </tr>
      `;
    }).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;margin:0;padding:24px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">

  <div style="background:#1e2a3a;padding:24px 32px;display:flex;justify-content:space-between;align-items:center;">
    <div>
      <h1 style="color:#fff;font-size:20px;margin:0 0 4px;">SchoolMS</h1>
      <p style="color:#94a3b8;font-size:12px;margin:0;">Report Card — ${exam.name}</p>
    </div>
    <div style="background:${divisionColor(division)};padding:8px 16px;border-radius:8px;text-align:center;">
      <div style="color:#fff;font-size:11px;margin-bottom:2px;">DIVISION</div>
      <div style="color:#fff;font-size:14px;font-weight:700;">${division}</div>
    </div>
  </div>

  <div style="padding:20px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
    <h2 style="color:#1e2a3a;font-size:18px;margin:0 0 8px;">${student.name}</h2>
    <table style="width:100%;font-size:13px;color:#64748b;">
      <tr>
        <td style="padding:2px 0;"><strong>Class:</strong></td>
        <td>${student.class_name} — Section ${student.class_section}</td>
        <td style="padding:2px 0;"><strong>Total:</strong></td>
        <td style="color:#2563eb;font-weight:700;">${totalObtained} / ${totalFull}</td>
      </tr>
      <tr>
        <td style="padding:2px 0;"><strong>Exam:</strong></td>
        <td>${exam.name} (${exam.academic_year})</td>
        <td style="padding:2px 0;"><strong>Percentage:</strong></td>
        <td style="color:#2563eb;font-weight:700;">${percentage}%</td>
      </tr>
    </table>
  </div>

  <div style="padding:20px 32px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#1e2a3a;color:#fff;">
          <th style="padding:10px 12px;text-align:left;">Subject</th>
          <th style="padding:10px 12px;text-align:center;">F.M</th>
          <th style="padding:10px 12px;text-align:center;">P.M</th>
          <th style="padding:10px 12px;text-align:center;">Obtained</th>
          <th style="padding:10px 12px;text-align:center;">%</th>
          <th style="padding:10px 12px;text-align:center;">Result</th>
        </tr>
      </thead>
      <tbody>${marksRows}</tbody>
      <tr style="background:#1e2a3a;color:#fff;">
        <td style="padding:8px 12px;font-weight:700;">TOTAL</td>
        <td style="padding:8px 12px;text-align:center;">${totalFull}</td>
        <td style="padding:8px 12px;text-align:center;">—</td>
        <td style="padding:8px 12px;text-align:center;font-weight:700;">${totalObtained}</td>
        <td style="padding:8px 12px;text-align:center;font-weight:700;">${percentage}%</td>
        <td style="padding:8px 12px;text-align:center;"></td>
      </tr>
    </table>
  </div>

  <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">
      Generated by SchoolMS on ${new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      })}
    </p>
  </div>

</div>
</body>
</html>`;

    await sendMail({
      to:      student.email,
      subject: `Report Card — ${student.name} | ${exam.name} | SchoolMS`,
      html:    emailHtml
    });

    res.json({
      success: true,
      message: `Report card sent to ${student.email}`
    });

  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({
      success: false, message: 'Failed to send email: ' + err.message
    });
  }
});

module.exports = router;