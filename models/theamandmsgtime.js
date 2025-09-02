// ChatSettings Schema
const mongoose = require("mongoose");

const chatSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true },   // jisne setting apply ki
  peerId: { type: String, required: true },   // kis user ke saath chat ke liye
  theme: { type: String, default: "default" },
  disappearing: {
    enabled: { type: Boolean, default: false },
    duration: { type: Number, default: 0 } // seconds me
  }
}, { timestamps: true });

module.exports = mongoose.model("ChatSettings", chatSettingsSchema);
