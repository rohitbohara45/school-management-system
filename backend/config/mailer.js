const nodemailer = require('nodemailer');
const path       = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((err) => {
  if (err) {
    console.warn('Email not configured:', err.message);
  } else {
    console.log('✅ Email service ready');
  }
});

// Simple send function so routes don't need to call sendMail directly
async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"SchoolMS" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
}

module.exports = { transporter, sendMail };