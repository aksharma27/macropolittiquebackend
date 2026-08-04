// utils/mailer.js
import nodemailer from 'nodemailer';
import dns from 'dns';
import dotenv from 'dotenv';

// ✅ Force IPv4 to avoid ENETUNREACH on Render
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Timeouts (optional)
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection error:', error);
  } else {
    console.log('✅ SMTP ready to send emails');
  }
});

export default transporter;