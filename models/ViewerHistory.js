const mongoose = require("mongoose");

const viewerHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ViewerHistory = mongoose.model("ViewerHistory", viewerHistorySchema);
module.exports = { ViewerHistory };
