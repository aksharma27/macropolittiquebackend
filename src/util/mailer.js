import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail', // or use host/port for other providers like SendGrid/AWS SES
  auth: {
    user: process.env.EMAIL_USER, // e.g., 'your-email@gmail.com'
    pass: process.env.EMAIL_PASS, // Your App Password
  },
});

export default transporter;
