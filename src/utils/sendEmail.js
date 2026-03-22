const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // 2. Define the email options
  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email, // Can be a comma-separated list or an array for bulk emails
    subject: options.subject,
    text: options.message,
    // html: options.html // You can also pass HTML templates here!
  };

  // 3. Actually send the email
  const info = await transporter.sendMail(message);
  console.log(`Email sent: ${info.messageId}`);
};

module.exports = sendEmail;