const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    lowercase: true,
    validate: {
      validator: function (v) {
        // Only lowercase English letters, numbers, underscores, or hyphens
        // Reject any non-ASCII or Arabic characters
        return /^[a-z0-9_-]+$/.test(v);
      },
      message:
        "Username must contain only lowercase English letters, numbers, underscores, or hyphens with no spaces.",
    },
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  // Add any other fields you need
  country: {
    type: String,
    default: "",
  },
  city: {
    type: String,
    default: "",
  },
  relationship: {
    type: String,
    default: "",
  },
  profilePicture: {
    type: Object,
    default: {
      url: "https://res.cloudinary.com/dedmoy0zp/image/upload/v1747751835/149071_uplmvs.png",
      publicId: null,
    },
  },
  verified: {
    type: Boolean,
    default: false,
  },
  bio: {
    type: String,
    default: "",
  },
  followersCount: {
    type: Number,
    default: 0,
  },
  followingCount: {
    type: Number,
    default: 0,
  },
  enabledViewerHistory: {
    type: Boolean,
    default: true,
  },
  otp: {
    type: String,
    default: "",
  },
  otpExpires: {
    type: Date,
    default: null,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorTempToken: {
    type: String,
    default: "",
  },
  twoFactorOTP: {
    type: String,
    default: "",
  },
  twoFactorExpires: {
    type: Date,
    default: null,
  },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
});

// Create a User model and export it
const User = mongoose.model("User", userSchema);
module.exports = { User };
