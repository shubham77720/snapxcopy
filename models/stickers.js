const mongoose = require("mongoose");

const stickerPackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  author: String,
  stickers: [
    {
      url: String,  // image/webp file path
      animated: { type: Boolean, default: false }
    }
  ],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // किसने import किया
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("StickerPack", stickerPackSchema);
