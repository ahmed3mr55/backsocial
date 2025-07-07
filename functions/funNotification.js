// utils/notifications.js
const { Notification } = require("../models/Notification");

const createNotification = async ({
  recipient,
  actor,
  type,
  target, // { id, model }
  meta = {}
}) => {
  try {
    const notification = new Notification({
      recipient,
      actor,
      type,
      target,
      meta,
      read: false,
    });
    await notification.save();
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

const deleteNotification = async ({
  recipient,
  actor,
  type,
  target // { id, model }
}) => {
  try {
    await Notification.deleteOne({
      recipient,
      actor,
      type,
      "target.id":   target.id,
      "target.model": target.model,
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
};

module.exports = { createNotification, deleteNotification };
