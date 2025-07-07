const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { verifyToken } = require("../Middleware/verifyToken");
const { generateOTP } = require("../functions/generateOTP");
const SECRET_KEY = process.env.SECRET_KEY;
const { sendEmailOTP2fa } = require("../Emails/SendEmailOTP2fa");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });
  // Validate email and password
  const schema = Joi.object({
    email: Joi.string().min(3).max(35).email().required(),
    password: Joi.string().min(6).max(255).required(),
  });
  const { error } = schema.validate({ email, password });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const findUser = await User.findOne({ email });
    if (!findUser)
      return res.status(400).json({ message: "Invalid email or password" });
    const isMatch = await bcrypt.compare(password, findUser.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });
    if (!findUser.twoFactorEnabled) {
      const payload = {
        id: findUser._id,
        isAdmin: findUser.isAdmin,
        tokenVersion: findUser.tokenVersion,
      };
      const SECRET_KEY = process.env.SECRET_KEY;
      if (!SECRET_KEY) return res.status(500).json({ message: "Server error" });
      // Generate JWT token
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "30d" });
      // Send token in response
      const userId = findUser._id.toString();
      return res
        .status(200)
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "none",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .json({ message: "Login successful", userId });
    }
    // Generate a temporary token for 2FA
    const otp = await generateOTP();
    findUser.twoFactorOTP = otp;
    findUser.twoFactorExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const tempToken = jwt.sign({ id: findUser._id }, process.env.SECRET_KEY, {
      expiresIn: "10m",
    });
    findUser.twoFactorTempToken = tempToken;
    await findUser.save();
    // Send OTP to user via email
    await sendEmailOTP2fa(findUser.email, otp, findUser.firstName);

    return res.status(200).json({
      message: "2FA OTP sent to your email",
      twoFactorRequired: true,
      tempToken,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// Verify OTP
router.post("/login/verify-otp", async (req, res) => {
  const { tempToken, otp } = req.body;

  let payload;
  try {
    payload = jwt.verify(tempToken, SECRET_KEY);
  } catch {
    return res.status(401).json({ message: "Invalid or expired temp token" });
  }
  const user = await User.findById(payload.id);
  if (!user || user.twoFactorTempToken !== tempToken) {
    return res.status(401).json({ message: "Use login first" });
  }

  if (user.twoFactorOTP !== otp || user.twoFactorExpires < Date.now()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  user.twoFactorTempToken = "";
  user.twoFactorOTP = "";
  user.twoFactorExpires = null;
  await user.save();

  const token = jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion, isAdmin: user.isAdmin },
    SECRET_KEY,
    { expiresIn: "30d" }
  );
  const userId = user._id.toString();
  return res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    .json({ message: "Login successful", userId });
});

function generateUsername() {
  const randomNum = Math.floor(Math.random() * 100_000)
    .toString()
    .padStart(5, "0");

  return (username = `user${randomNum}`);
}

async function generateUniqueUsername() {
  let username;
  let exists = true;

  while (exists) {
    username = generateUsername();
    exists = await User.exists({ username });
  }

  return username;
}

router.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  // Validate input
  const schema = Joi.object({
    firstName: Joi.string().min(3).max(10).required(),
    lastName: Joi.string().min(3).max(10).required(),
    email: Joi.string().min(3).max(35).email().required(),
    password: Joi.string().min(6).max(255).required(),
  });
  const { error } = schema.validate({ firstName, lastName, email, password });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Invalid email or password" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const username = await generateUniqueUsername();
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      username,
    });
    await newUser.save();
    const payload = {
      id: newUser._id,
      isAdmin: newUser.isAdmin,
      tokenVersion: newUser.tokenVersion,
    };
    const SECRET_KEY = process.env.SECRET_KEY;
    if (!SECRET_KEY) return res.status(500).json({ message: "Server error" });
    // Generate JWT token
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "30d" });
    const userId = newUser._id.toString();
    // Send token in response
    return res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
      .json({ message: "Login successful", userId });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/toggle-2fa", verifyToken, async (req, res) => {
  const user = req.user;
  try {
    if (user.twoFactorEnabled) {
      user.twoFactorEnabled = false;
      user.twoFactorTempToken = null;
      user.twoFactorOTP = "";
      user.twoFactorExpires = null;
      await user.save();
      return res.status(200).json({ message: "2FA disabled" });
    }
    user.twoFactorEnabled = true;
    await user.save();
    return res.status(200).json({ message: "2FA Enabled" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// get status 2fa
router.get("/get-status-2fa", verifyToken, async (req, res) => {
  const user = req.user;
  try {
    return res.status(200).json({
      twoFactorEnabled: user.twoFactorEnabled,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// Logout route
router.post("/logout", verifyToken, async (req, res) => {
  try {
    // Clear the cookie
    res.clearCookie("token");
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
