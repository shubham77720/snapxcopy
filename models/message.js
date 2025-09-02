const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String },
  fileUrl: { type: String },
  type: { type: String, default: "text" }, // text, image, document, location, emoji
  location: { lat: Number, lng: Number, address: String },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  reactions: [{ emoji: String, userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }],
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // for "delete for me"
  read: { type: Boolean, default: false },
  deletedForSender: { type: Boolean, default: false }, // for "delete for me" by sender
  deletedForReceiver: { type: Boolean, default: false }, // for "delete for
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", messageSchema);
