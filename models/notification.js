// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // receiver
  type: { type: String, enum: ["post", "like", "comment", "mention", "collab"], required: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who triggered
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);
