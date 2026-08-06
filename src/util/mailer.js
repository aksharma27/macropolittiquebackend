// utils/mailer.js
import nodemailer from 'nodemailer';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
 host: 'smtp.gmail.com',
 port: 587,
 secure: false, // STARTTLS
 auth: {
 user: process.env.EMAIL_USER,
 pass: process.env.EMAIL_PASS,
 },
 connectionTimeout: 15000,
 greetingTimeout: 15000,
 socketTimeout: 20000,
 tls: {
 rejectUnauthorized: true,
 },
});

transporter.verify((error) => {
 if (error) {
 console.error('❌ SMTP connection error:', error);
 } else {
 console.log('✅ SMTP ready to send emails');
 }
});

export default transporter;
