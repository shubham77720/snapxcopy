// models/Status.js
const mongoose = require("mongoose");

const statusItemSchema = new mongoose.Schema({
  type: { type: String, enum: ["image", "video"], required: true },
  url: { type: String, required: true },
  caption: { type: String },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // who has seen
  timestamp: { type: Date, default: Date.now }
});

const statusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [statusItemSchema],
  createdAt: { type: Date, default: Date.now, expires: "24h" } // auto delete after 24 hours
});

module.exports = mongoose.model("Status", statusSchema);
