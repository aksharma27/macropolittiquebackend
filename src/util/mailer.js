// utils/mailer.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
 user: process.env.EMAIL_USER,
 pass: process.env.EMAIL_PASS, // Gmail App Password
 },
 connectionTimeout: 10000,
 greetingTimeout: 10000,
 socketTimeout: 15000,
});

transporter.verify((error) => {
 if (error) {
 console.error('❌ SMTP connection error:', error);
 } else {
 console.log('✅ SMTP ready to send emails');
 }
});

export default transporter;
