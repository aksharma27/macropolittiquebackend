// utils/mailer.js
import nodemailer from 'nodemailer';
import dns from 'dns/promises';
import dotenv from 'dotenv';

dotenv.config();

// Hardcoded fallback IP (currently valid for smtp.gmail.com)
const FALLBACK_IP = '142.251.4.108'; // update if needed

let smtpHost = 'smtp.gmail.com';
let smtpPort = 465;
let secure = true;

// Try to resolve IPv4; if fails, use hardcoded IP
try {
  const { address } = await dns.lookup('smtp.gmail.com', { family: 4 });
  smtpHost = address;
  console.log(`✅ Resolved smtp.gmail.com IPv4: ${smtpHost}`);
} catch (err) {
  console.warn(`⚠️ IPv4 resolution failed, using fallback IP ${FALLBACK_IP}`, err.message);
  smtpHost = FALLBACK_IP;
}

// Create transporter with the determined host (IP or hostname)
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: secure,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    servername: 'smtp.gmail.com', // always validate against the real domain
    rejectUnauthorized: true,
  },
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