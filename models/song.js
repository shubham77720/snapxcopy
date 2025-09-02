import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artist: { type: String },
    album: { type: String },
    songId: String,
  fromUser: String, // jisne play kiya
  toUser: String,   // jiske liye play ho raha hai
  isPlaying: Boolean,
  currentTime: Number,
    fileUrl: { type: String, required: true }, // stored path
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export default mongoose.model("Song", songSchema);
