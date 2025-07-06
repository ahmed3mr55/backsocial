const express = require("express");
const router = express.Router();
const { Link } = require("../models/Link");
const { User } = require("../models/User");
const { verifyToken } = require("../Middleware/verifyToken");
const Joi = require("joi");

// get All links of a user
router.get("/user", verifyToken, async (req, res) => {
  const user = req.user._id;
  try {
    const links = await Link.find({ user: user }).sort({ createdAt: -1 });
    return res.status(200).json({ links });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// get All Links of a username
router.get("/:username", async (req, res) => {
  const { username } = req.params;
  const schema = Joi.object({
    username: Joi.string().min(3).max(35).required(),
  });
  const { error } = schema.validate({ username });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const user = await User.findOne({ username }).select("_id");
    if (!user) return res.status(404).json({ message: "User not found" });
    const links = await Link.find({ user }).sort({ createdAt: -1 });
    return res.status(200).json({ links });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// Create a new Link and add it to the user
router.post("/create", verifyToken, async (req, res) => {
  const user = req.user._id;
  const { name, url } = req.body;
  const schema = Joi.object({
    name: Joi.string().required().min(3).max(15),
    url: Joi.string().required().min(3).max(300),
  });
  const { error } = schema.validate({ name, url });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  // Check if the max number of links has been reached
  const maxLinks = 4;
  const linksCount = await Link.countDocuments({ user: user });
  if (linksCount >= maxLinks) {
    return res
      .status(403)
      .json({ message: "You have reached the maximum number of links" });
  }
  try {
    const newLink = new Link({
      name,
      url,
      user: user._id,
    });
    await newLink.save();
    return res
      .status(200)
      .json({ message: "Link added successfully", link: newLink });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// Update a Link
router.put("/updateLink/:linkId", verifyToken, async (req, res) => {
  const { linkId } = req.params;
  const schema = Joi.object({
    linkId: Joi.string().required(),
    name: Joi.string().optional().min(3).max(15),
    url: Joi.string().optional().min(3).max(300),
  });
  const { error } = schema.validate({ linkId });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.url) updates.url = req.body.url;
    const updatedLink = await Link.findByIdAndUpdate(linkId, updates, {
      new: true,
    });
    if (!updatedLink)
      return res.status(404).json({ message: "Link not found" });
    if (updatedLink.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this link" });
    }
    return res
      .status(200)
      .json({ message: "Link updated successfully", link: updatedLink });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// delete a Link
router.delete("/deleteLink/:linkId", verifyToken, async (req, res) => {
  const { linkId } = req.params;
  const schema = Joi.object({
    linkId: Joi.string().required(),
  });
  const { error } = schema.validate({ linkId });
  if (error) return res.status(400).json({ message: error.details[0].message });
  try {
    const deletedLink = await Link.findByIdAndDelete(linkId);
    if (!deletedLink)
      return res.status(404).json({ message: "Link not found" });
    if (deletedLink.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this link" });
    }
    return res.status(200).json({ message: "Link deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
