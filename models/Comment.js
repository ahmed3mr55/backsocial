const mongoose = require("mongoose");
const Joi = require("joi");

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  likes: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isShare: {
    type: Boolean,
    default: false,
  },
  replyCount: {
    type: Number,
    default: 0,
  },
});

const Comment = mongoose.model("Comment", commentSchema);
module.exports = { Comment };
