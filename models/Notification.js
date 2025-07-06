const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["follow", "comment", "reply", "like", "viewer", "User", "FollowRequest"],
    required: true,
  },
  target: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "target.model",
    },
    model: {
      type: String,
      required: true,
      enum: ["Post", "Comment", "ReplyComment", "Like", "Follow", "FollowRequest", "User", "ViewerHistory"],
    },
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  meta: {
    title: String,
    link: String,
    extra: mongoose.Mixed,
  },
});
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = { Notification };
