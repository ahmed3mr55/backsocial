const express = require("express");
const router = express.Router();
const { ReplyComment } = require("../models/ReplyComment");
const { Post } = require("../models/Post");
const { Comment } = require("../models/Comment");
const { verifyToken } = require("../Middleware/verifyToken");
const Joi = require("joi");
const {
  createNotification,
  deleteNotification,
} = require("../functions/funNotification");

// get all replies to a comment
// GET /api/replyComment/comments/:commentId/replies?skip=0&limit=3
router.get("/comments/:commentId/replies", async (req, res) => {
  const { commentId } = req.params;
  const skip = parseInt(req.query.skip, 10) || 0;
  const limit = parseInt(req.query.limit, 10) || 3;

  try {
    const replies = await ReplyComment.find({ commentId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit + 1)
      .populate("user", "firstName lastName username profilePicture verified")
      .lean();

    const hasMore = replies.length > limit;
    if (hasMore) replies.pop();

    return res.status(200).json({
      replies,
      pagination: { hasMore },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// post a reply to a comment created by a user
router.post("/comments/:commentId/create", verifyToken, async (req, res) => {
  const { commentId } = req.params;
  const { body } = req.body;
  const user = req.user;
  const schema = Joi.object({
    body: Joi.string().min(1).max(500).required(),
    commentId: Joi.string().required(),
  });
  const { error } = schema.validate({ body, commentId });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    await comment.updateOne({ $inc: { replyCount: 1 } });
    const replyCommnet = new ReplyComment({
      commentId,
      user: user._id,
      body,
    });
    await replyCommnet.save();
    // update Count of post
    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: 1 },
    });
    const populatedReply = await ReplyComment.findById(replyCommnet._id)
      .populate("user", "firstName lastName username profilePicture verified")
      .exec();

    if (comment.user.toString() !== user._id.toString()) {
      await createNotification({
        recipient: comment.user,
        actor: user._id,
        type: "reply",
        target: { id: replyCommnet._id, model: "ReplyComment" },
        meta: {
          title: `${user.firstName} ${user.lastName} replied to your comment`,
          link: `/${comment.post}`,
        },
      });
    }
    return res.status(201).json({ reply: populatedReply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

// delete a reply comment
router.delete(
  "/comments/:commentId/:replyId/delete",
  verifyToken,
  async (req, res) => {
    const { commentId, replyId } = req.params;
    const user = req.user;
    const schema = Joi.object({
      commentId: Joi.string().required(),
      replyId: Joi.string().required(),
    });
    const { error } = schema.validate({ commentId, replyId });
    if (error)
      return res.status(400).json({ message: error.details[0].message });
    try {
      const comment = await Comment.findById(commentId);
      if (!comment)
        return res.status(404).json({ message: "Comment not found" });
      const reply = await ReplyComment.findById(replyId);
      if (!reply) return res.status(404).json({ message: "Reply not found" });
      if (reply.user.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "You are not authorized to delete this reply" });
      }
      await reply.deleteOne();
      await comment.updateOne({ $inc: { replyCount: -1 } });
      await Post.updateOne(
        { _id: comment.post },
        { $inc: { commentsCount: -1 } }
      );
      await deleteNotification(reply.user, user._id, "reply", {
        id: replyId,
        model: "ReplyComment",
      });
      return res.status(200).json({ message: "Reply deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// update a reply comment
router.put(
  "/comments/:commentId/:replyId/update",
  verifyToken,
  async (req, res) => {
    const { commentId, replyId } = req.params;
    const { body } = req.body;
    const user = req.user;
    const schema = Joi.object({
      body: Joi.string().min(1).max(200).required(),
      commentId: Joi.string().required(),
      replyId: Joi.string().required(),
    });
    const { error } = schema.validate({ body, commentId, replyId });
    if (error)
      return res.status(400).json({ message: error.details[0].message });
    try {
      const comment = await Comment.findById(commentId);
      if (!comment)
        return res.status(404).json({ message: "Comment not found" });
      const reply = await ReplyComment.findById(replyId);
      if (!reply) return res.status(404).json({ message: "Reply not found" });
      if (reply.user.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "You are not authorized to update this reply" });
      }
      const updatedReply = await ReplyComment.findByIdAndUpdate(
        replyId,
        { body },
        { new: true }
      );
      const populatedReply = await ReplyComment.findById(updatedReply._id)
        .populate("user", "firstName lastName username profilePicture verified")
        .exec();
      return res.status(200).json({ reply: populatedReply });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
