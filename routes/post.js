const express = require("express");
const router = express.Router();
const { Post } = require("../models/Post");
const { Comment } = require("../models/Comment");
const { ReplyComment } = require("../models/ReplyComment");
const { User } = require("../models/User");
const { Like } = require("../models/Like");
const Follow = require("../models/Follow");
const { verifyToken } = require("../Middleware/verifyToken");
const { optionalAuth } = require("../Middleware/optionalAuth");
const Joi = require("joi");
const { isDirty } = require("../utils/filterWords");

// Create a new post route
router.post("/create", verifyToken, async (req, res) => {
  const { body } = req.body;
  const user = req.user;
  // Validate post body
  const schema = Joi.object({
    body: Joi.string().min(1).max(500).required(),
  });
  const { error } = schema.validate({ body });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  if (isDirty(body)) {
    return res.status(400).json({ message: "Post contains dirty words. Repeated violations will result in a ban" });
  }
  try {
    let newPost = new Post({
      body,
      user: user._id,
      postType: "post",
    });
    await newPost.save();
    newPost = await newPost.populate(
      "user",
      "firstName lastName username profilePicture verified"
    );
    return res.status(201).json({
      message: "Post created successfully",
      post: newPost,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

// Get all posts route with pagination
router.get("/getAll", optionalAuth, async (req, res) => {
  let { limit = "10", skip = "0" } = req.query;
  limit = parseInt(limit, 10);
  skip = parseInt(skip, 10);

  // 1) Validate inputs
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    skip: Joi.number().integer().min(0).default(0),
  });
  const { error, value } = schema.validate({ limit, skip });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { limit: lim, skip: skp } = value;

  try {
    // 2) get following
    const followingSet = new Set();
    if (req.user) {
      const follows = await Follow.find({ follower: req.user.id })
        .select("following")
        .lean();
      follows.forEach((f) => followingSet.add(f.following.toString()));
    }

    // 3) get posts
    const rawPosts = await Post.find()
      .populate(
        "user",
        "firstName lastName username profilePicture verified isPrivate"
      )
      .lean();

    // 4) filter posts
    const posts = rawPosts.filter((p) => {
      const uid = p.user._id.toString();
      if (!p.user.isPrivate) return true;
      if (req.user && uid === req.user.id) return true;
      return followingSet.has(uid);
    });

    // 5) get likes
    const allIds = posts.map((p) => p._id.toString());
    let likedSet = new Set();
    if (req.user) {
      const likes = await Like.find({
        user: req.user.id,
        post: { $in: allIds },
      })
        .select("post")
        .lean();
      likes.forEach((l) => likedSet.add(l.post.toString()));
    }

    // 6) prepare posts
    const result = posts.map((p) => ({
      ...p,
      type: "post",
      isLiked: likedSet.has(p._id.toString()),
    }));
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 7) paginate
    const paged = result.slice(skp, skp + lim);

    return res.status(200).json({
      message: "Posts fetched successfully",
      totalPosts: result.length,
      limit: lim,
      skip: skp,
      posts: paged,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

// Get posts of a single user with pagination
router.get("/:username", optionalAuth, async (req, res) => {
  const { username } = req.params;
  let { limit = "10", skip = "0" } = req.query;
  limit = parseInt(limit, 10);
  skip = parseInt(skip, 10);

  // 1) Validate inputs
  const schema = Joi.object({
    username: Joi.string().trim().min(3).max(35).required(),
    limit: Joi.number().integer().min(1).max(100).default(10),
    skip: Joi.number().integer().min(0).default(0),
  });
  const { error, value } = schema.validate({ username, limit, skip });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { limit: lim, skip: skp } = value;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2) Check follow status if private
    const isFollowing = req.user
      ? await Follow.exists({ follower: req.user.id, following: user._id })
      : false;

    if (
      user.isPrivate &&
      !isFollowing &&
      (!req.user || req.user.id.toString() !== user._id.toString())
    ) {
      return res.status(403).json({
        message: "This account is private",
        totalPosts: 0,
        limit: lim,
        skip: skp,
        posts: [],
      });
    }

    // 3) Fetch posts
    const totalPosts = await Post.countDocuments({ user: user._id });
    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip(skp)
      .limit(lim)
      .populate("user", "firstName lastName username profilePicture verified")
      .lean();

    // 4) Determine liked posts in batch
    let postsWithLike = posts;
    if (req.user) {
      const postIds = posts.map((p) => p._id);
      const likes = await Like.find({
        user: req.user.id,
        post: { $in: postIds },
      }).select("post");
      const likedSet = new Set(likes.map((l) => l.post.toString()));
      postsWithLike = posts.map((p) => ({
        ...p,
        isLiked: likedSet.has(p._id.toString()),
      }));
    } else {
      postsWithLike = posts.map((p) => ({ ...p, isLiked: false }));
    }

    return res.status(200).json({
      message: "User posts fetched successfully",
      totalPosts,
      limit: lim,
      skip: skp,
      posts: postsWithLike,
    });
  } catch (err) {
    console.error("Error in /:username:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

// get all posts of a single user me
router.get("/me/posts", verifyToken, async (req, res) => {
  const userId = req.user._id;
  let { limit = "10", skip = "0" } = req.query;
  limit = parseInt(limit, 10);
  skip = parseInt(skip, 10);
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
    skip: Joi.number().integer().min(0).default(0),
  });
  const { error, value } = schema.validate({ limit, skip });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { limit: lim, skip: skp } = value;
  try {
    const totalPosts = await Post.countDocuments({ user: userId });
    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skp)
      .limit(lim)
      .populate("user", "firstName lastName username profilePicture verified")
      .lean();
    if (posts.length === 0) {
      return res.status(404).json({ message: "No posts found" });
    }
    return res.status(200).json({
      message: "User posts fetched successfully",
      totalPosts,
      limit: lim,
      skip: skp,
      posts,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

// Get a single post route
router.get("/getPost/:postId", optionalAuth, async (req, res) => {
  const { postId } = req.params;

  // 1) Validate postId format
  const schema = Joi.object({
    postId: Joi.string().length(24).hex().required(),
  });
  const { error } = schema.validate({ postId });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    // 2) Fetch post and populate author
    const post = await Post.findById(postId)
      .populate(
        "user",
        "firstName lastName username profilePicture verified isPrivate"
      )
      .lean();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const author = post.user;

    // 3) Check privacy
    const isOwner =
      req.user && req.user.id.toString() === author._id.toString();
    const isFollowing = req.user
      ? await Follow.exists({ follower: req.user.id, following: author._id })
      : false;

    if (author.isPrivate && !isOwner && !isFollowing) {
      return res.status(403).json({ message: "This post is private" });
    }

    // 4) Compute isLiked if authenticated
    if (req.user) {
      const liked = await Like.exists({ user: req.user.id, post: postId });
      post.isLiked = Boolean(liked);
    }

    // 5) Return
    return res.status(200).json({
      message: "Post fetched successfully",
      post,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update a post route
router.put("/update/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;
  const { body } = req.body;
  // Validate postId format
  const schema = Joi.object({
    postId: Joi.string().required(),
    body: Joi.string().min(1).max(500).required(),
  });
  const { error } = schema.validate({ postId, body });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this post" });
    }
    post.body = body;
    await post.save();
    await post.populate(
      "user",
      "firstName lastName username profilePicture verified"
    );
    return res.status(200).json({
      message: "Post updated successfully",
      post,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.delete("/delete/:postId", verifyToken, async (req, res) => {
  const { postId } = req.params;

  // 1) Validation
  const schema = Joi.object({
    postId: Joi.string().length(24).hex().required(),
  });
  const { error } = schema.validate({ postId });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    // 2) Load post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // 3) Gather all comment IDs
    const comments = await Comment.find({ post: postId }).select("_id").lean();
    const commentIds = comments.map((c) => c._id);

    // 4) Delete replies
    await ReplyComment.deleteMany({ commentId: { $in: commentIds } });

    // 5) Delete comments
    await Comment.deleteMany({ post: postId });

    // 6) Delete likes
    await Like.deleteMany({ post: postId });

    // 7) Delete post
    await post.deleteOne();

    return res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
