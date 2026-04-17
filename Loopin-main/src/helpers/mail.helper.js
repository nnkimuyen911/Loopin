const nodemailer = require('nodemailer');

// Tạo transporter 1 lần duy nhất (tái sử dụng connection pool)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  }
});

// Kiểm tra kết nối SMTP ngay khi server start
transporter.verify((error, success) => {
  if (error) {
    console.error('[Email] ❌ SMTP connection failed:', error.message);
  } else {
    console.log('[Email] ✅ SMTP server is ready. Using:', process.env.GMAIL_USER);
  }
});

module.exports.sendMail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Loopin Team" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`[Email] ✅ Sent to ${to}: ${info.response}`);
    return info;
  } catch (error) {
    console.error(`[Email] ❌ Failed to send to ${to}:`);
    console.error(`  Code: ${error.code}`);
    console.error(`  Message: ${error.message}`);
    if (error.response) console.error(`  SMTP Response: ${error.response}`);
    throw error;
  }
};

