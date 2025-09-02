const express = require("express");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 📌 Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 📌 Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

// ===================
// Existing Edit Route
// ===================
router.put("/edit", authMiddleware, async (req, res) => {
  try {
    const { username, bio, dob, profileImage } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { username, bio, dob, profileImage },
      { new: true, runValidators: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// New Upload Profile Image
// ========================
router.post("/upload-profile-image", authMiddleware, upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const imageUrl = `http://localhost:5000/${req.file.path}`;

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: imageUrl },
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====================
// Existing Profile Get
// ====================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    console.log("Fetching profile for user ID:", req.userId);
    const user = await User.findOne({ _id: req.userId }).select("-password").populate("friends", "username profileImage");
    console.log("User profile fetched:", user);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// backend route
router.get("/:id",authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password").populate("friends", "username profileImage");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user,me:req.userId });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ====================
// Existing Search User
// ====================
router.get("/search/:phone", authMiddleware, async (req, res) => {
  console.log("Searching for user with phone:", req.params.phone);
  
  const { phone } = req.params;
  if (!phone) return res.status(400).json({ error: "Phone number is required" });

  const user = await User.findOne({ phone }).select("-password");
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json(user);
});
// ✅ Get Friend List
router.get("/friends", authMiddleware, async (req, res) => {
  console.log("Fetching friends for user ID:", req.userId);
  try {
    const user = await User.findById(req.userId).populate("friends", "username profileImage");
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/notifications/ll", authMiddleware, async (req, res) => {
  console.log("Fetching notifications for user ID:", req.userId);
  try {

    const user = await User.findById(req.userId)
      .populate("friendRequests", "username profileImage phone")
      .populate("sentRequests", "username profileImage phone");

    res.json({
      friendRequests: user.friendRequests || [],
      sentRequests: user.sentRequests || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Send Friend Request
router.post("/friend-request/:id", authMiddleware, async (req, res) => {
  console.log("Sending friend request to user ID:", req.params.id);
  try {
    const fromUser = await User.findById(req.userId);
    const toUser = await User.findById(req.params.id);

    if (!toUser) return res.status(404).json({ error: "User not found" });
    if (toUser.blocked.includes(fromUser._id)) return res.status(403).json({ error: "You're blocked" });
    if (fromUser.friends.includes(toUser._id)) return res.status(400).json({ error: "Already friends" });

    // Already sent?
    if (fromUser.sentRequests.includes(toUser._id)) return res.status(400).json({ error: "Request already sent" });

    fromUser.sentRequests.push(toUser._id);
    toUser.friendRequests.push(fromUser._id);

    await fromUser.save();
    await toUser.save();

    res.json({ message: "Friend request sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// In your userRoutes.js
router.get("/relationship/:id", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const otherUserId = req.params.id;

    if (currentUser.friends.includes(otherUserId)) {
      return res.json({ status: "friends" });
    } else if (currentUser.sentRequests.includes(otherUserId)) {
      return res.json({ status: "requested" });
    } else {
      return res.json({ status: "none" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Accept Friend Request
router.post("/friend-request/:id/accept", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const fromUser = await User.findById(req.params.id);

    if (!currentUser.friendRequests.includes(fromUser._id)) {
      return res.status(400).json({ error: "No friend request found" });
    }

    // Remove from request arrays
    currentUser.friendRequests = currentUser.friendRequests.filter(
      (id) => id.toString() !== fromUser._id.toString()
    );
    fromUser.sentRequests = fromUser.sentRequests.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );

    // Add to friends
    currentUser.friends.push(fromUser._id);
    fromUser.friends.push(currentUser._id);

    await currentUser.save();
    await fromUser.save();

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ Cancel Friend Request (Sender cancels their sent request)
router.post("/friend-request/cancel/:id", authMiddleware, async (req, res) => {
  try {
    console.log("Cancelling friend request to user ID:", req.params.id);
    const sender = await User.findById(req.userId); // Current user (sender)
    const receiver = await User.findById(req.params.id); // The user who received the request

    if (!sender || !receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove from sender's sentRequests
    sender.sentRequests = sender.sentRequests.filter(
      (id) => id.toString() !== receiver._id.toString()
    );

    // Remove from receiver's friendRequests
    receiver.friendRequests = receiver.friendRequests.filter(
      (id) => id.toString() !== sender._id.toString()
    );

    await sender.save();
    await receiver.save();

    res.json({ message: "Friend request cancelled" });
  } catch (err) {
    console.error("Error cancelling friend request:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Reject Friend Request
router.post("/friend-request/reject/:id", authMiddleware, async (req, res) => {
  // try {
  console.log("Rejecting friend request from user ID:", req.params.id);
    const currentUser = await User.findById(req.userId); // ✅ Use req.user.id, not req.userId
    const fromUser = await User.findById(req.params.id);

    if (!currentUser || !fromUser) {
      console.error("User not found:", req.userId, req.params.id);
      return res.status(404).json({ error: "User not found" });
    }

    // Remove the request from both users
    console.log("Current user friend requests before:", currentUser);
    console.log("From user sent requests before:", fromUser);  
    currentUser.friendRequests = currentUser.friendRequests.filter(
      (id) => id.toString() !== fromUser._id.toString()
    );
    fromUser.sentRequests = fromUser.sentRequests.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );

    await currentUser.save();
    await fromUser.save();

    res.json({ message: "Friend request rejected" });
  // } catch (err) {
  //   console.error("Error rejecting friend request:", err);
  //   res.status(500).json({ error: "Server error" });
  // }
});

// ✅ Unfriend
router.post("/unfriend/:id", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const targetUser = await User.findById(req.params.id);

    currentUser.friends = currentUser.friends.filter(
      (id) => id.toString() !== targetUser._id.toString()
    );
    targetUser.friends = targetUser.friends.filter(
      (id) => id.toString() !== currentUser._id.toString()
    );

    await currentUser.save();
    await targetUser.save();

    res.json({ message: "Unfriended successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Block User
router.post("/block/:id", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const targetUser = await User.findById(req.params.id);

    if (!currentUser.blocked.includes(targetUser._id)) {
      currentUser.blocked.push(targetUser._id);
      currentUser.friends = currentUser.friends.filter(
        (id) => id.toString() !== targetUser._id.toString()
      );
    }

    await currentUser.save();
    res.json({ message: "User blocked" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Unblock
router.post("/unblock/:id", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    currentUser.blocked = currentUser.blocked.filter(
      (id) => id.toString() !== req.params.id
    );
    await currentUser.save();
    res.json({ message: "User unblocked" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Mute/Unmute
router.post("/mute/:id", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const isMuted = currentUser.muted.includes(req.params.id);

    if (isMuted) {
      currentUser.muted = currentUser.muted.filter(
        (id) => id.toString() !== req.params.id
      );
    } else {
      currentUser.muted.push(req.params.id);
    }

    await currentUser.save();
    res.json({ message: isMuted ? "Unmuted" : "Muted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




module.exports = router;
