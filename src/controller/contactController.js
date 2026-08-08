import resend from "../util/mailer.js";

export const sendContactEmail = async (req, res) => {
  try {
    const { name, email, number, subject, message } = req.body;

    if (!name || !email || !number || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    const senderEmail = process.env.RESEND_SENDER_EMAIL;
    const senderName = process.env.RESEND_SENDER_NAME;
    const adminEmail = process.env.ADMIN_EMAIL;

    const htmlContent = `
      <h2>New Contact Message</h2>

      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${number}</p>
      <p><strong>Subject:</strong> ${subject}</p>

      <hr>

      <p>${message}</p>
    `;

    const textContent = `
Name: ${name}
Email: ${email}
Phone: ${number}

Subject: ${subject}

Message:
${message}
`;

    const { data, error } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [adminEmail],
      replyTo: email,
      subject: `New Contact Message: ${subject}`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error("Resend Error:", error);

      return res.status(500).json({
        success: false,
        error: error.message || "Failed to send email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      data,
    });

  } catch (error) {
    console.error("Resend Error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send email",
    });
  }
};