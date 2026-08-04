// utils/mailer.js
import nodemailer from 'nodemailer';
import dns from 'dns/promises';  // use promises for async resolution
import dotenv from 'dotenv';

dotenv.config();

// Resolve IPv4 address of Gmail SMTP (cached at startup)
let smtpHost = 'smtp.gmail.com';
let smtpPort = 465;
let secure = true;

try {
  const { address } = await dns.lookup('smtp.gmail.com', { family: 4 });
  smtpHost = address;  // use the IP directly
  console.log(`✅ Resolved smtp.gmail.com IPv4: ${smtpHost}`);
} catch (err) {
  console.warn('⚠️ IPv4 resolution failed, falling back to hostname:', err.message);
  // keep smtpHost as 'smtp.gmail.com'
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: secure,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Important: if we use an IP, we must tell TLS the expected hostname
  tls: {
    servername: 'smtp.gmail.com',   // SNI and certificate validation
    rejectUnauthorized: true,       // keep secure
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