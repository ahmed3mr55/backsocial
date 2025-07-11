const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const { createViewerHistory } = require("../functions/createViewerHistory");
const bcrypt = require("bcrypt");
const { verifyToken } = require("../Middleware/verifyToken");
const { optionalAuth } = require("../Middleware/optionalAuth");
const Joi = require("joi");
const photoUpload = require("../Middleware/photoUpload");
const {
  cloudinaryUploadImage,
  cloudinaryDeleteImage,
} = require("../utils/cloudinary");
const { FollowRequest } = require("../models/FollowRequest");
const Follow = require("../models/Follow");
const { isDirty } = require("../utils/filterWords");

router.get("/me", verifyToken, async (req, res) => {
  const user = req.user;
  try {
    const currentUser = await User.findById(user.id)
      .select(
        "-password -resetPasswordToken -resetPasswordExpire -twoFactorOTP -twoFactorTempToken -twoFactorExpires -twoFactorEnabled"
      )
      .lean();
    return res.status(200).json({
      message: "User found",
      user: currentUser,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// get one user by username
router.get("/:username", optionalAuth, async (req, res) => {
  const { username } = req.params;
  const currentUser = req.user;

  const schema = Joi.object({
    username: Joi.string().min(3).max(35).required(),
  });
  const { error } = schema.validate({ username });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const searchUser = await User.findOne({ username })
      .select(
        "-password -resetPasswordToken -resetPasswordExpire -twoFactorOTP -twoFactorTempToken -twoFactorExpires -twoFactorEnabled"
      )
      .lean();
    if (!searchUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser) {
      const viewer = await User.findById(currentUser.id)
        .select("_id enabledViewerHistory")
        .lean();
      if (
        viewer &&
        viewer.enabledViewerHistory &&
        viewer._id.toString() !== searchUser._id.toString()
      ) {
        await createViewerHistory(currentUser.id, searchUser);
      }
    }

    return res.status(200).json({
      message: "User found",
      user: searchUser,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/update", verifyToken, async (req, res) => {
  const userId = req.user._id;
  const RESERVED_USERNAMES = [
    "profile",
    "profile_",
    "_profile_",
    "_profile",
    "admin",
    "settings",
    "about",
    "help",
    "contact",
    "privacy",
    "terms",
    "blog",
    "newsletter",
    "unsubscribe",
    "api",
    "auth",
    "login",
    "logout",
    "register",
    "verify",
    "reset",
    "password",
    "token",
    "token_",
    "_token_",
    "_token",
    "verify",
    "reset",
    "password",
    "token",
    "token_",
    "search",
    "followRequests",
  ];
  const schema = Joi.object({
    username: Joi.string()
      .min(3)
      .max(35)
      .pattern(/^[a-z0-9_-]+$/)
      .invalid(...RESERVED_USERNAMES)
      .optional()
      .messages({
        "any.invalid": "Username is invalid",
      }),
    email: Joi.string().email().optional().min(3).max(60),
    country: Joi.string().optional().min(1).max(100),
    city: Joi.string().optional().min(1).max(100),
    firstName: Joi.string().optional().min(1).max(15),
    lastName: Joi.string().optional().min(1).max(15),
    bio: Joi.string().optional().min(1).max(500),
    password: Joi.string().optional().min(6).max(255),
    tokenVersion: Joi.boolean().optional(),
    relationship: Joi.string().optional(),
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const updates = {};
    if (req.body.username) updates.username = req.body.username;
    if (req.body.email) updates.email = req.body.email;
    if (req.body.country) updates.country = req.body.country;
    if (req.body.city) updates.city = req.body.city;
    if (req.body.firstName) {
      if (isDirty(req.body.firstName)) {
        return res.status(400).json({
          message:
            "First name contains dirty words. Repeated violations will result in a ban",
        });
      }
      updates.firstName = req.body.firstName;
    }
    if (req.body.lastName) {
      if (isDirty(req.body.lastName)) {
        return res.status(400).json({
          message:
            "Last name contains dirty words. Repeated violations will result in a ban",
        });
      }
      updates.lastName = req.body.lastName;
    }
    if (req.body.bio) {
      if (isDirty(req.body.bio)) {
        return res.status(400).json({
          message:
            "Bio contains dirty words. Repeated violations will result in a ban",
        });
      }
      updates.bio = req.body.bio;
    }
    if (req.body.relationship) updates.relationship = req.body.relationship;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(req.body.password, salt);
    }
    if (req.body.tokenVersion === true) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      updates.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    const existinUser = await User.findOne({
      $or: [{ username: updates.username }, { email: updates.email }],
      _id: { $ne: userId },
    });
    if (existinUser) {
      return res
        .status(400)
        .json({ message: "username or email already exists" });
    }
    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

// upload profile picture
router.post(
  "/uploadProfilePicture",
  photoUpload.single("image"),
  verifyToken,
  async (req, res) => {
    // 1 Validate file type
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      // 2 Upload to cloudinary
      const result = await cloudinaryUploadImage(req.file.buffer);
      if (!result) {
        return res.status(500).json({ message: "Failed to upload image" });
      }
      // 3 get the user from database
      const user = req.user;

      // 4 delete the old image from cloudinary
      if (user.profilePicture.publicId !== null) {
        await cloudinaryDeleteImage(user.profilePicture.publicId);
      }
      // 5 Change the profile picture
      user.profilePicture = {
        url: result.secure_url,
        publicId: result.public_id,
      };
      // save the user
      await user.save();
      return res.status(200).json({
        message: "Image uploaded successfully",
        image: {
          url: result.secure_url,
          publicId: result.public_id,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error", error });
    }
  }
);

// Toggle private
router.post("/togglePrivate", verifyToken, async (req, res) => {
  const user = req.user;
  try {
    if (user.isPrivate) {
      // check if the user has any follow requests
      const followReqs = await FollowRequest.find({ receiver: user._id });
      const count = followReqs.length;
      const followDocs = followReqs.map((r) => ({
        insertOne: {
          document: { follower: r.sender, following: user._id },
        },
      }));
      await Follow.bulkWrite(followDocs);
      await FollowRequest.deleteMany({ receiver: user._id });
      user.followersCount = (user.followersCount || 0) + count;
      user.isPrivate = false;
      await user.save();
      return res.status(200).json({ message: "Account is now public" });
    } else {
      user.isPrivate = true;
      await user.save();
      return res.status(200).json({ message: "Account is now private" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
