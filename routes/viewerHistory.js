const express = require("express");
const router = express.Router();
const { ViewerHistory } = require("../models/ViewerHistory");
const { verifyToken } = require("../Middleware/verifyToken");

// get viewer history
router.get("/", verifyToken, async (req, res) => {
  const me = req.user;
  try {
    if (me.enabledViewerHistory === false) {
      return res.status(403).json({ message: "Viewer history is disabled" });
    }
    const history = await ViewerHistory.find({ targetUser: me._id })
      .populate(
        "user",
        "firstName lastName username profilePicture verified"
      )
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({
      message: "Viewer history fetched successfully",
      viewerHistory : history,
    });
  } catch (error) {
    console.error("Error fetching viewer history:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// toggle viewer history
router.post("/toggle", verifyToken, async (req, res) => {
  const user = req.user;
  try {
    if (user.enabledViewerHistory) {
      user.enabledViewerHistory = false;
      await user.save();
      return res
        .status(200)
        .json({
          message: "Viewer history disabled",
          enabledViewerHistory: false,
        });
    } else {
      user.enabledViewerHistory = true;
      await user.save();
      return res
        .status(200)
        .json({
          message: "Viewer history enabled",
          enabledViewerHistory: true,
        });
    }
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
