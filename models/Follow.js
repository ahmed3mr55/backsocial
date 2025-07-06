const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

followSchema.index({ following: 1 });
followSchema.index({ follower: 1 });

module.exports = mongoose.model('Follow', followSchema);
