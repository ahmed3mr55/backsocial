const nodemailer = require("nodemailer");

async function sendLinkForgotPassword(email, link, firstName) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
  });
  const mailOptions = {
    from: `"A Social" <${process.env.EMAIL}>`,
    to: email,
    subject: "Password Reset Request",
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #f44336; color: white; text-align: center; padding: 20px;">
        <h2>Password Reset Request</h2>
      </div>
      <div style="padding: 20px; line-height: 1.6;">
        <h3 style="color: #333;">Hello ${firstName},</h3>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${link}" target="_blank" style="
            background-color: #4CAF50; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 5px; 
            display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If you didn’t request a password reset, you can ignore this email.</p>
        <p style="font-size: 12px; color: #555;">This link will expire in 15 minutes.</p>
      </div>
      <div style="background-color: #f9f9f9; text-align: center; padding: 10px; font-size: 12px; color: #777;">
        <p>Thank you for using our service!</p>
      </div>
    </div>
  `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error("Failed to send email");
  }
}

module.exports = sendLinkForgotPassword;
