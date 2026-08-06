import brevoApi from '../util/mailer.js';
import Brevo from '@getbrevo/brevo';

export const sendContactEmail = async (req, res) => {
  try {
    const { name, email, number, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !number || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Retrieve environment variables
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME;
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    // Build email content
    const htmlContent = `
      <h3>New Contact Message Received</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Number:</strong> ${number}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong> ${message}</p>
    `;

    const textContent = `
      Name: ${name}
      Email: ${email}
      Number: ${number || 'Not provided'}
      Subject: ${subject}
      Message: ${message}
    `;

    // Prepare the email object
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: adminEmail }];
    sendSmtpEmail.subject = `New Contact Message: ${subject}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.textContent = textContent;

    // Send the email via Brevo API
    const response = await brevoApi.sendTransacEmail(sendSmtpEmail);

    // Success response
    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      data: response,
    });

  } catch (error) {
    console.error('Error sending contact email:', error);
    res.status(500).json({
      error: 'Failed to send email. Please try again later.',
      details: error.message,
    });
  }
};