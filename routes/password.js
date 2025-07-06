const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Joi = require('joi');
const { User } = require('../models/User');
const jwt = require('jsonwebtoken');
const sendLinkForgotPassword = require('../Emails/SendLinkForgotPassword');


// forgot password send link to email route
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body
    // Validate email format
    const schema = Joi.object({
        email: Joi.string().min(3).max(35).email().required(),
    });
    const { error } = schema.validate({ email });
    if (error) return res.status(400).json({ message: error.details[0].message });
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(200).json({message: "Password reset link sent to your email"});
        // Generate a password reset token
        const payload = {
            id: user._id,
            email: user.email,
        }
        const token = jwt.sign(
            payload,
            process.env.SECRET_KEY + user.password,
            { expiresIn: '15m' }
        )
        user.resetPasswordToken = token;
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();
        const link = `http://localhost:3000/auth/reset-password/${user._id}/${token}`;
        // Send email with the reset link
        await sendLinkForgotPassword(user.email, link, user.firstName);
        return res.status(200).json({message: "Password reset link sent to your email"});
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
})

// get reset password link and check if token is valid
router.get('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    // Validate token format
    const schema = Joi.object({
        token: Joi.string().required(),
        id: Joi.string().required(),
    });
    const { error } = schema.validate({ token, id });
    if (error) return res.status(400).json({ message: error.details[0].message });
    try {
        const user = await User.findById(id);
        if (!user || user.resetPasswordToken !== token || user.resetPasswordExpire < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        const SECRET_KEY = process.env.SECRET_KEY + user.password;
        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                return res.status(400).json({ message: 'Invalid or expired token' });
            }
        })
        return res.status(200).json({email: user.email})
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
})

// reset password route
router.post('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });
    // Validate password format
    const schema = Joi.object({
        password: Joi.string().min(6).max(255).required(),
        confirmPassword: Joi.string().min(6).max(255).required(),
    });
    const { error } = schema.validate({ password, confirmPassword });
    if (error) return res.status(400).json({ message: error.details[0].message });
    try {
        const user = await User.findById(id);
        if (!user || user.resetPasswordToken !== token || user.resetPasswordExpire < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        if (await bcrypt.compare(password, user.password)) {
            return res.status(400).json({ message: 'New password cannot be the same as the old password' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        return res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
})

module.exports = router;