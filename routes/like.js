const express = require("express");
const router = express.Router();
const { Post } = require("../models/Post");
const { Comment } = require("../models/Comment");
const { Like } = require("../models/Like");
const { createNotification, deleteNotification } = require("../functions/funNotification");
const { verifyToken } = require("../Middleware/verifyToken");
const Joi = require("joi");

// Toggle like/unlike a post

router.post("/toggleLikePost/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const user = req.user;

  // Validate postId format
  const schema = Joi.object({
    postId: Joi.string().length(24).hex().required(),
  });
  const { error } = schema.validate({ postId });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const post = await Post.findById(postId).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const existingLike = await Like.findOne({ user: user._id, post: postId });
    if (existingLike) {
      // Unlike
      await existingLike.deleteOne();
      await Post.updateOne({ _id: postId }, { $inc: { likesCount: -1 } });
      // delete notification
      if (post.user.toString() !== user._id.toString()) {
        await deleteNotification({
          recipient: post.user,
          actor: user._id,
          type: "like",
          target: { id: post._id, model: "Post" },
        })
      }
      
      return res.status(200).json({ message: "Post unliked successfully" });
    } else {
      // Like
      await Like.create({ user: user._id, post: postId });
      await Post.updateOne({ _id: postId }, { $inc: { likesCount: 1 } });

      if (post.user.toString() !== user._id.toString()) {
        // Create notification
        await createNotification({
          recipient: post.user,
          actor: user._id,
          type: "like",
          target: { id: post._id, model: "Post" },
          meta: {
            title: `${user.firstName} ${user.lastName} liked your post.`,
            link: `/${post._id}`,
          },
        })
      }

      return res.status(200).json({ message: "Post liked successfully" });
    }
  } catch (err) {
    console.error("toggleLikePost error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Like a comment toggle
router.post("/toggleLikeComment", verifyToken, async (req, res) => {
  const { commentId } = req.body;
  const user = req.user;
  // Validate commentId format
  const schema = Joi.object({
    commentId: Joi.string().required(),
  });
  const { error } = schema.validate({ commentId });
  if (error) return res.status(404).json({ message: error.details[0].message });
  try {
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    // Check if the user has already liked the comment
    const hasLiked = comment.likes.includes(user._id.toString());
    if (hasLiked) {
      // Unlike the comment
      await Comment.updateOne(
        { _id: commentId },
        { $pull: { likes: user._id } }
      );
      comment.likesCount -= 1;
      await comment.save();
      return res.status(200).json({ message: "Comment unliked successfully" });
    } else {
      // Like the comment
      await Comment.updateOne(
        { _id: commentId },
        { $push: { likes: user._id } }
      );
      comment.likesCount += 1;
      await comment.save();
      return res.status(200).json({ message: "Comment liked successfully" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// Get status like post of a user
router.get("/getStatusLikePost", verifyToken, async (req, res) => {
  const { postId } = req.body;
  const user = req.user;

  // Validate postId format
  const schema = Joi.object({
    postId: Joi.string().length(24).hex().required(),
  });
  const { error } = schema.validate({ postId });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const post = await Post.findById(postId).select("_id");
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if a Like document exists
    const existingLike = await Like.exists({
      user: user._id,
      post: postId,
    });

    return res.status(200).json({ isLiked: Boolean(existingLike) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
