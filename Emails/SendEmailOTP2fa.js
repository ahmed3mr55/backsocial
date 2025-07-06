const nodemailer = require("nodemailer");

async function sendEmailOTP2fa(email, otp, firstName) {
  const transorter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
  });
  const mailOptions = {
    from: `"A Social" <${process.env.EMAIL}>`,
    to: email,
    subject: "Your 2FA Verification Code",
    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
      ">
        <!-- Header -->
        <div style="
          background-color: #0056b3;
          color: #fff;
          text-align: center;
          padding: 16px 0;
        ">
          <h1 style="margin: 0; font-size: 20px;">Two-Factor Authentication</h1>
        </div>

        <!-- Body -->
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px; margin-bottom: 24px;">
            Hi <strong>${firstName}</strong>,
          </p>
          <p style="font-size: 15px; margin-bottom: 24px;">
            We received a request to sign in to your account. Enter the code below to verify it’s you.
          </p>

          <div style="text-align: center; margin-bottom: 24px;">
            <span style="
              display: inline-block;
              padding: 12px 24px;
              font-size: 22px;
              font-weight: bold;
              color: #0056b3;
              background-color: #f1f8ff;
              border-radius: 4px;
              letter-spacing: 4px;
            ">
              ${otp}
            </span>
          </div>

          <p style="font-size: 14px; color: #555;">
            This code will expire in <strong>5 minutes</strong>. Do not share it with anyone.
          </p>

          <p style="font-size: 14px; color: #555; margin-top: 24px;">
            If you didn’t request this, you can safely ignore this email or contact our support team.
          </p>
        </div>

        <!-- Footer -->
        <div style="
          background-color: #fafafa;
          text-align: center;
          padding: 12px 0;
          font-size: 12px;
          color: #888;
          border-top: 1px solid #e0e0e0;
        ">
          <p style="margin: 0;">Thank you for choosing YAY Social</p>
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} YAY Social Media</p>
        </div>
      </div>
    `,
  };
  try {
    await transorter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send OTP email");
  }
}

module.exports = { sendEmailOTP2fa };
