const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Profile Info
  bio: { type: String, default: "Hey there! I am using ChatApp." },
  dob: { type: Date, default: null },
  profileImage: { type: String, default: "https://via.placeholder.com/150" },

  // Friend System
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Requests received
  sentRequests:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Requests sent
  friends:        [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Confirmed friends

  // Controls
  blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  muted:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  notifications: [
  {
    type: { type: String }, // "like", "comment", etc.
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    createdAt: { type: Date, default: Date.now }
  }
],

}, { timestamps: true });

// Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password comparison
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
