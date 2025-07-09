const express = require("express");
const router = express.Router();
const { Comment } = require("../models/Comment");
const { verifyToken } = require("../Middleware/verifyToken");
const Joi = require("joi");
const { Post } = require("../models/Post");
const { PostShare } = require("../models/PostShare");
const {
  createNotification,
  deleteNotification,
} = require("../functions/funNotification");
const { isDirty } = require("../utils/filterWords");

// Create a new comment route
router.post("/create/:postId", verifyToken, async (req, res) => {
  const { body } = req.body;
  const { postId } = req.params;
  const user = req.user;
  // Validate comment body and postId
  const schema = Joi.object({
    body: Joi.string().min(1).max(500).required(),
    postId: Joi.string().required(),
  });
  const { error } = schema.validate({ body, postId });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  if (isDirty(body)) {
    return res.status(400).json({ message: "Comment contains dirty words. Repeated violations will result in a ban" });
  }
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const newComment = new Comment({
      body,
      post: postId,
      user: user._id,
    });
    await newComment.save();
    await Post.updateOne(
      {
        _id: postId,
      },
      {
        $inc: { commentsCount: 1 },
      }
    );
    await newComment.populate(
      "user",
      "firstName lastName username profilePicture"
    );
    // create Notification
    console.log("userID", post.user);
    console.log("current user", user._id);

    // Create notification
    await createNotification({
      recipient: post.user,
      actor: user._id,
      type: "comment",
      target: { id: postId, model: "Post" },
      meta: {
        title: `${user.firstName} ${user.lastName} commented on your post.`,
        link: `/${user.username}/${postId}`,
      },
    });

    return res.status(201).json({
      message: "Comment created successfully",
      comment: newComment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// Get all comments for a post route
router.get("/getAll/:postId", async (req, res) => {
  const { postId } = req.params;
  // Validate postId format
  const schema = Joi.object({
    postId: Joi.string().required(),
  });
  const { error } = schema.validate({ postId });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  try {
    const comments = await Comment.find({ post: postId })
      .populate("user", "firstName lastName username profilePicture verified")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({
      message: "Comments fetched successfully",
      comments,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

// Update a comment route
router.put("/update/:commentId", verifyToken, async (req, res) => {
  const { commentId } = req.params;
  const { body } = req.body;
  // Validate commentId format
  const schema = Joi.object({
    commentId: Joi.string().required(),
    body: Joi.string().min(1).max(500).required(),
  });
  const { error } = schema.validate({ commentId, body });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this comment" });
    }
    comment.body = body;
    await comment.save();

    await comment.populate(
      "user",
      "firstName lastName username profilePicture verified"
    );
    return res.status(200).json({
      message: "Comment updated successfully",
      comment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete a comment route
router.delete("/delete/:commentId", verifyToken, async (req, res) => {
  const { commentId } = req.params;
  // Validate commentId format
  const schema = Joi.object({
    commentId: Joi.string().required(),
  });
  const { error } = schema.validate({ commentId });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this comment" });
    }
    await Comment.deleteOne({ _id: commentId });
    await Post.updateOne(
      { _id: comment.post },
      { $inc: { commentsCount: -1 } }
    );
    return res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// get All comments of a user
router.get("/me", verifyToken, async (req, res) => {
  const user = req.user;
  try {
    const comments = await Comment.find({ user: user._id })
      .populate("user", "firstName lastName username profilePicture")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({
      message: "Comments fetched successfully",
      comments,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
