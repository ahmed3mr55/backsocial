const express = require("express");
const router = express.Router();
const { Notification } = require("../models/Notification");
const { verifyToken } = require("../Middleware/verifyToken");
const Joi = require("joi");

// get all notifications for the current user
// routes/notification.js
router.get("/all", verifyToken, async (req, res) => {
  const userId = req.user._id;

  // validation
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(100),
    skip: Joi.number().integer().min(0),
  });
  const { error } = schema.validate(req.query);
  if (error) return res.status(400).json({ message: error.details[0].message });

  // 1) delete all notifications older than 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  await Notification.deleteMany({
    recipient: userId,
    createdAt: { $lt: cutoff },
  });

  // 2) pagination settings
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip  = parseInt(req.query.skip)  || 0;

  try {
    // 3) get notifications
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actor", "firstName lastName username profilePicture verified")

    // 4) mark notifications as read
    const ids = notifications.map((n) => n._id);
    if (ids.length) {
      await Notification.updateMany(
        { _id: { $in: ids } },
        { $set: { read: true } }
      );
    }

    // 5) get unread count
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });

    return res.status(200).json({
      message: "Notifications fetched successfully",
      notifications,
      unreadCount,
      pagination: { skip, limit, fetched: notifications.length },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});


module.exports = router;