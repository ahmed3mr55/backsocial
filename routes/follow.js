const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const Follow = require("../models/Follow");
const { FollowRequest } = require("../models/FollowRequest");
const { verifyToken } = require("../Middleware/verifyToken");
const Joi = require("joi");
const {
  createNotification,
  deleteNotification,
} = require("../functions/funNotification");

// Toggle follow/unfollow a user
router.post("/toggleFollow/:username", verifyToken, async (req, res) => {
  const { username } = req.params;
  const currentUser = req.user;

  // 1) Validate username
  const schema = Joi.object({
    username: Joi.string().min(3).max(35).required(),
  });
  const { error } = schema.validate({ username });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // 2) Prevent following yourself
  if (currentUser.username === username) {
    return res.status(400).json({ message: "You can't follow yourself" });
  }

  try {
    // 3) Find target user
    const targetUser = await User.findOne({ username });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const targetId = targetUser._id;

    // 4) Check existing follow
    const existingFollow = await Follow.findOne({
      follower: currentUser._id,
      following: targetId,
    });

    if (existingFollow) {
      // Unfollow
      await existingFollow.deleteOne();
      currentUser.followingCount--;
      targetUser.followersCount--;
      await currentUser.save();
      await targetUser.save();

      // Remove notification
      await deleteNotification({
        recipient: targetId,
        actor: currentUser._id,
        type: "follow",
        target: { id: targetId, model: "Follow" },
      });

      return res.status(200).json({ message: "Unfollowed successfully" });
    }

    // 5) Handle follow request if private
    if (targetUser.isPrivate) {
      const existingRequest = await FollowRequest.findOne({
        sender: currentUser._id,
        receiver: targetId,
      });

      if (existingRequest) {
        // cancel request
        await existingRequest.deleteOne();
        await deleteNotification({
          recipient: targetId,
          actor: currentUser._id,
          type: "FollowRequest",
          target: { id: existingRequest._id, model: "FollowRequest" },
        });
        return res.status(200).json({ message: "Follow request cancelled" });
      } else {
        // send request
        const reqDoc = await FollowRequest.create({
          sender: currentUser._id,
          receiver: targetId,
          status: "pending",
        });
        await createNotification({
          recipient: targetId,
          actor: currentUser._id,
          type: "FollowRequest",
          target: { id: reqDoc._id, model: "FollowRequest" },
          meta: {
            title: `${currentUser.firstName} ${currentUser.lastName} sent you a follow request`,
            link: `/${currentUser.username}`,
          },
        });
        return res.status(200).json({ message: "Follow request sent" });
      }
    }

    // 6) Public account → follow directly
    await Follow.create({
      follower: currentUser._id,
      following: targetId,
    });
    currentUser.followingCount++;
    targetUser.followersCount++;
    await currentUser.save();
    await targetUser.save();

    await createNotification({
      recipient: targetId,
      actor: currentUser._id,
      type: "follow",
      target: { id: targetId, model: "Follow" },
      meta: {
        title: `${currentUser.firstName} ${currentUser.lastName} started following you`,
        link: `/${currentUser.username}`,
      },
    });

    return res.status(200).json({ message: "Followed successfully" });
  } catch (err) {
    console.error("toggleFollow error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// delete Follower
router.delete("/follower-delete/:followerId/:username", verifyToken, async (req, res) => {
  const { followerId, username } = req.params;
  const currentUser = req.user;
  // Validate followerId
  const schema = Joi.object({
    followerId: Joi.string().length(24).hex().required(),
    username: Joi.string().min(3).max(35).required(),
  })
  const { error } = schema.validate({ followerId, username });
  if (error) return res.status(400).json({ message: error.details[0].message });
  if (currentUser.username !== username) return res.status(401).json({ message: "Unauthorized" });
  try {
    // Check existing follower
    const follower = await Follow.findOne({
      follower: followerId,
      following: currentUser._id,
    })
    if (!follower) return res.status(404).json({ message: "Follower not found" });
    // Check authorization
    const followerUser = await User.findById(follower.follower);
    if (!followerUser) return res.status(404).json({ message: "Follower user not found" });
    await follower.deleteOne();
    // Update follower count & following count
    currentUser.followersCount = Math.max(0, currentUser.followersCount - 1);
    followerUser.followingCount = Math.max(0, followerUser.followingCount - 1);
    await currentUser.save();
    await followerUser.save();
    return res.status(200).json({ message: "Follower deleted successfully", follower: followerUser });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
})

// Get followers of a user
router.get("/followers/:username", verifyToken, async (req, res) => {
  const { username } = req.params;
  let { limit = "10", skip = "0" } = req.query;
  limit = parseInt(limit, 10);
  skip = parseInt(skip, 10);
  // Validate username
  const schema = Joi.object({
    username: Joi.string().min(3).max(35).required(),
  });
  const { error } = schema.validate({ username });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const user = await User.findOne({ username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    const followers = await Follow.find({ following: user._id })
      .populate("follower", "firstName lastName username profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const followerUsers = followers.map((f) => f.follower);

    return res.status(200).json({
      message: "Followers fetched successfully",
      followers: followerUsers,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get following of a user
router.get("/following/:username", verifyToken, async (req, res) => {
  const { username } = req.params;
  let { limit = "5", skip = "0" } = req.query;
  limit = parseInt(limit, 10);
  skip = parseInt(skip, 10);
  // Validate username
  const schema = Joi.object({
    username: Joi.string().min(3).max(35).required(),
    limit: Joi.number().integer().min(1).max(100).default(10),
    skip: Joi.number().integer().min(0).default(0),
  });
  const { error } = schema.validate({ username });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const user = await User.findOne({ username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });
    const following = await Follow.find({ follower: user._id })
      .populate("following", "firstName lastName username profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const followingUsers = following.map((f) => f.following);
    return res.status(200).json({
      message: "Following fetched successfully",
      following: followingUsers,
      limit,
      skip,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get mutual followers between two users
router.get("/mutual/:username1/:username2", verifyToken, async (req, res) => {
  const { username1, username2 } = req.params;
  // Validate usernames
  const schema = Joi.object({
    username1: Joi.string().min(3).max(35).required(),
    username2: Joi.string().min(3).max(35).required(),
  });
  const { error } = schema.validate({ username1, username2 });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const user1 = await User.findOne({ username: username1 }).select("_id");
    const user2 = await User.findOne({ username: username2 }).select("_id");
    if (!user1 || !user2)
      return res.status(404).json({ message: "User not found" });
    const mutualFollowers = await Follow.find({
      $or: [
        { follower: user1._id, following: user2._id },
        { follower: user2._id, following: user1._id },
      ],
    })
      .populate("follower", "firstName lastName username profilePicture")
      .sort({ createdAt: -1 })
      .lean();
    const mutualUsers = mutualFollowers.map((f) => f.follower);
    return res.status(200).json({
      message: "Mutual followers fetched successfully",
      mutualFollowers: mutualUsers,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get status follow of a user
router.get("/getStatusFollow/:username", verifyToken, async (req, res) => {
  const { username } = req.params;
  const currentUser = req.user;
  // Validate username
  const schema = Joi.object({
    username: Joi.string().min(3).max(35).required(),
  });
  const { error } = schema.validate({ username });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const user = await User.find({ username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });
    const existing = await Follow.findOne({
      follower: currentUser._id,
      following: user._id,
    });
    if (existing) {
      return res.status(200).json({ isFollowing: true });
    } else {
      return res.status(200).json({ isFollowing: false });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get status following of a user
router.get("/getStatusFollowing/:username", verifyToken, async (req, res) => {
  const { username } = req.params;
  const currentUser = req.user;

  // 1. Validate username
  const schema = Joi.object({
    username: Joi.string().min(3).max(35).required(),
  });
  const { error } = schema.validate({ username });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    // 2. Find the target user
    const targetUser = await User.findOne({ username }).select("_id isPrivate");
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // 3. Cannot follow yourself
    if (targetUser._id.equals(currentUser._id)) {
      return res.status(200).json({ message: "You can't follow yourself" });
    }

    // 4. Check direct follow first
    const existingFollow = await Follow.findOne({
      follower: currentUser._id,
      following: targetUser._id,
    });
    if (existingFollow) {
      // Already following => can unfollow
      return res.status(200).json({ action: "unfollow" });
    }

    // 5. Now handle private vs public
    if (targetUser.isPrivate) {
      // account is private, check pending request
      const existingRequest = await FollowRequest.findOne({
        sender: currentUser._id,
        receiver: targetUser._id,
      });
      if (existingRequest) {
        return res.status(200).json({ action: "cancel_request" });
      } else {
        return res.status(200).json({ action: "send_request" });
      }
    } else {
      // public account and not followed => can follow
      return res.status(200).json({ action: "follow" });
    }
  } catch (err) {
    console.error("getStatusFollowing error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
