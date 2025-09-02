// routes/songroute.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
// import Song from "../models/Song.js"; // ✅ apna model import karo

const router = express.Router();

// Upload folder
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, "song.mp3") // हमेशा सिर्फ़ 1 गाना रहेगा
});
const upload = multer({ storage });

// ✅ Upload Song
router.post("/upload", upload.single("song"), async (req, res) => {
  try {
    const fileUrl = `/uploads/song.mp3`;

    // पहले से कोई गाना है तो delete करो
    await Song.deleteMany({});

    // DB में नया गाना save करो
    const newSong = await Song.create({
      title: req.body.title || "Untitled",
      artist: req.body.artist || "Unknown",
      album: req.body.album || "",
      fileUrl,
      uploadedBy: req.user?._id || null // अगर auth है तो
    });

    // Socket emit
    const io = req.app.get("io");
    io.emit("songUploaded", { song: newSong });

    res.json({ success: true, song: newSong });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
});

// ✅ Delete Song (Close पर)
router.delete("/delete", async (req, res) => {
  try {
    const filePath = path.join(UPLOAD_DIR, "song.mp3");

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Song.deleteMany({}); // DB से भी delete

    const io = req.app.get("io");
    io.emit("songDeleted", { message: "Song deleted" });

    res.json({ success: true, message: "Song deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ success: false, error: "Delete failed" });
  }
});

// ✅ Get Current Song
router.get("/current", async (req, res) => {
  const song = await Song.findOne();
  if (!song) return res.status(404).json({ success: false, message: "No song found" });
  res.json({ success: true, song });
});

export default router; // ✅ ESM export
