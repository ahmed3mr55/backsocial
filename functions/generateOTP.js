

async function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    return otp.toString();
}

module.exports = { generateOTP };