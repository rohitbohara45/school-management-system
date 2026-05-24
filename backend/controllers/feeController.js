const { validationResult } = require('express-validator');
const FeeModel = require('../models/feeModel');
const PDFDocument = require('pdfkit');

const feeController = {

    getAll: async (req, res) => {
        try {
            const fees = await FeeModel.getAll({
                student_id: req.query.student_id || null,
                status: req.query.status || null,
                class_id: req.query.class_id || null,
                year: req.query.year || null,
                month: req.query.month || null
            });
            res.json({ success: true, count: fees.length, data: fees });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to fetch fees' });
        }
    },

    getSummary: async (req, res) => {
        try {
            const summary = await FeeModel.getSummary(req.query.year || null);
            res.json({ success: true, data: summary });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to fetch summary' });
        }
    },

    getOne: async (req, res) => {
        try {
            const fee = await FeeModel.getById(req.params.id);
            if (!fee) {
                return res.status(404).json({ success: false, message: 'Fee record not found' });
            }
            res.json({ success: true, data: fee });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to fetch fee' });
        }
    },

    create: async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false, message: 'Validation failed', errors: errors.array()
            });
        }
        try {
            const { student_id, month, academic_year, amount, status, paid_date } = req.body;
            const newId = await FeeModel.create({
                student_id, month, academic_year, amount, status, paid_date
            });
            const fee = await FeeModel.getById(newId);
            res.status(201).json({ success: true, message: 'Fee record created', data: fee });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Fee record already exists for this student and month'
                });
            }
            res.status(500).json({ success: false, message: 'Failed to create fee record' });
        }
    },

    update: async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false, message: 'Validation failed', errors: errors.array()
            });
        }
        try {
            const existing = await FeeModel.getById(req.params.id);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Fee record not found' });
            }
            await FeeModel.update(req.params.id, req.body);
            const updated = await FeeModel.getById(req.params.id);
            res.json({ success: true, message: 'Fee updated', data: updated });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to update fee' });
        }
    },

    delete: async (req, res) => {
        try {
            const existing = await FeeModel.getById(req.params.id);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Fee record not found' });
            }
            await FeeModel.delete(req.params.id);
            res.json({ success: true, message: 'Fee record deleted' });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to delete fee' });
        }
    },

    bulkCreate: async (req, res) => {
        try {
            const { class_id, month, year, amount } = req.body;
            if (!class_id || !month || !amount) {
                return res.status(400).json({
                    success: false, message: 'class_id, month and amount are required'
                });
            }
            const result = await FeeModel.bulkCreate(class_id, month, year, amount);
            res.json({
                success: true,
                message: `Created ${result.created} records. Skipped ${result.skipped} (already exist).`,
                data: result
            });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Bulk create failed: ' + err.message });
        }
    },

    // Generate PDF receipt
    getReceipt: async (req, res) => {
        try {
            const fee = await FeeModel.getById(req.params.id);
            if (!fee) {
                return res.status(404).json({ success: false, message: 'Fee record not found' });
            }
            if (fee.status !== 'paid') {
                return res.status(400).json({
                    success: false, message: 'Receipt only available for paid fees'
                });
            }

            const doc = new PDFDocument({ margin: 50, size: [400, 560] });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="receipt-${fee.receipt_no}.pdf"`
            );
            doc.pipe(res);

            // Header
            doc.rect(0, 0, 400, 90).fill('#1e2a3a');
            doc.fillColor('#ffffff')
                .fontSize(18).font('Helvetica-Bold')
                .text('SchoolMS', 30, 20);
            doc.fillColor('#94a3b8')
                .fontSize(9).font('Helvetica')
                .text('Fee Receipt', 30, 46);
            doc.fillColor('#60a5fa')
                .fontSize(11).font('Helvetica-Bold')
                .text(fee.receipt_no, 30, 62);

            // Paid stamp
            doc.rect(280, 18, 90, 54).fill('#16a34a');
            doc.fillColor('#ffffff')
                .fontSize(16).font('Helvetica-Bold')
                .text('PAID', 280, 36, { width: 90, align: 'center' });

            // Student info
            let y = 112;
            const infoItems = [
                ['Student', fee.student_name],
                ['Class', `${fee.class_name || '—'} — ${fee.class_section || '—'}`],
                ['Month', `${fee.month} ${fee.academic_year}`],
                ['Paid On', fee.paid_date
                    ? new Date(fee.paid_date).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    })
                    : '—'],
            ];

            infoItems.forEach(([label, value]) => {
                doc.fillColor('#64748b').fontSize(9).font('Helvetica')
                    .text(label + ':', 40, y);
                doc.fillColor('#1e2a3a').fontSize(10).font('Helvetica-Bold')
                    .text(value, 130, y);
                y += 22;
            });

            // Amount box
            y += 10;
            doc.rect(40, y, 320, 64).fill('#f0fdf4').stroke('#bbf7d0');
            doc.fillColor('#64748b').fontSize(9).font('Helvetica')
                .text('Amount Paid', 50, y + 10);
            doc.fillColor('#16a34a').fontSize(28).font('Helvetica-Bold')
                .text(`Rs. ${parseFloat(fee.amount).toFixed(2)}`, 50, y + 24);

            // Footer
            y += 100;
            doc.moveTo(40, y).lineTo(360, y).stroke('#e2e8f0');
            y += 12;
            doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
                .text('This is a computer-generated receipt.', 40, y,
                    { width: 320, align: 'center' });
            doc.text(
                `Generated on ${new Date().toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric'
                })}`,
                40, y + 14, { width: 320, align: 'center' }
            );

            doc.end();

        } catch (err) {
            console.error('Receipt error:', err);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Failed to generate receipt' });
            }
        }
    }

};

module.exports = feeController;