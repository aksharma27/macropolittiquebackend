// backend/controllers/contactController.js
import transporter from '../util/mailer.js';

export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, number, subject, message } = req.body;

    console.log('Contact form received:', req.body); // Debug log

    // Validate
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject, and message are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const adminEmail = process.env.EMAIL_USER || 'admin@example.com';       //change to ADMIN_EMAIL = macropolitique@gmail.com

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      text: `
        Name: ${name}
        Email: ${email}
        Phone: ${number || 'Not provided'}
        Subject: ${subject}
        Message:
        ${message}
      `,
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${number || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `,
    };

    console.log('Mail options prepared:', mailOptions); // Debug log

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
};