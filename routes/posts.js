const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const Status = require("../models/status");
const User = require("../models/user");

// ================= Multer setup =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error("Only image files are allowed!"));
  }
});


router.post("/upload", authMiddleware, async (req, res) => {

  console.log("Upload status triggered",req.body);
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Items array is required" });
    }

    const status = await Status.create({
      user: req.userId,
      items
    });

    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ================= Create Post =================
router.post("/createpost", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const post = await Post.create({
      user: req.userId,
      caption: req.body.caption,
      image: imageUrl,
    });

    const populatedPost = await post.populate("user", "username profileImage");
    // req.io.emit("newPost", populatedPost);

    res.json(populatedPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ================= Get All Posts =================
router.get("/posts", authMiddleware, async (req, res) => {
  console.log("Fetching posts for user:", req.userId);
  try {
    const posts = await Post.find({user :req.userId})
      .populate("user", "username profileImage")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

     res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/friendspost", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Get logged-in user's friends list
    const user = await User.findById(userId).select("friends");
    if (!user) return res.status(404).json({ message: "User not found" });
console.log("User's friends:", user.friends);
    // Get posts from friends only
   const posts = await Post.find({ user: { $in: user.friends } })
  .populate("user", "username profileImage")
  .sort({ createdAt: -1 });

      console.log(posts)

    res.json(posts);
  } catch (error) {
    console.error("Error fetching friends' posts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get posts of another user (only if friends)
router.get("/user/:userId/posts", authMiddleware, async (req, res) => {
  const { userId } = req.params;

  try {
    // If the requested user is the same as logged-in user → allow
    if (req.userId === userId) {
      const posts = await Post.find({ user: userId })
        .populate("user", "username profileImage")
        .populate("comments.user", "username profileImage")
        .sort({ createdAt: -1 });

      return res.json(posts);
    }

    // Fetch logged-in user
    const loggedInUser = await User.findById(req.userId);
    if (!loggedInUser) {
      return res.status(404).json({ error: "Logged-in user not found" });
    }

    // Check if requested user is a friend
    const isFriend = loggedInUser.friends.includes(userId);
    if (!isFriend) {
      return res.status(403).json({ error: "You are not friends with this user" });
    }

    // If friends → return posts
    const posts = await Post.find({ user: userId })
      .populate("user", "username profileImage")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });

    res.json(posts);

  } catch (err) {
    console.error("Error fetching user posts:", err);
    res.status(500).json({ error: "Server error" });
  }
});


router.get("/posts/:id", authMiddleware, async (req, res) => {
  console.log("Fetching single post with ID:", req.params.id);
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "username profileImage")
      .populate("comments.user", "username profileImage")
      .populate("likes", "username profileImage");

      const likearray = await Post.findById(req.params.id).select("likes");
     if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({post ,likearray});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= Delete Post =================
router.delete("/:id", authMiddleware, async (req, res) => {
  // try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ error: "Not allowed" });
    }
    await Post.findByIdAndDelete(req.params.id);
    // await post.remove();
    // req.io.emit("deletePost", req.params.id);
    res.json({ message: "Post deleted" });
  // } catch (err) {
  //   res.status(500).json({ error: err.message });
  // }
});

// ================= Like / Unlike Post =================
router.post("/:id/like", authMiddleware, async (req, res) => {
  console.log("Toggling like for post ID:", req.params.id, "by user ID:", req.userId);
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const liked = post.likes.includes(req.userId);
    if (liked) post.likes.pull(req.userId);
    else post.likes.push(req.userId);

    await post.save();

    const populatedPost = await Post.findById(req.params.id)
      .populate("user", "username profileImage")
      .populate("comments.user", "username profileImage");

    // req.io.emit("updatePost", populatedPost);
    res.json(populatedPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= Comment on Post =================
router.post("/:id/comment", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = { user: req.userId, text: req.body.text };
    post.comments.push(comment);
    await post.save();

    const populatedPost = await Post.findById(req.params.id)
      .populate("user", "username profileImage")
      .populate("comments.user", "username profileImage");

    // req.io.emit("updatePost", populatedPost);
    res.json(populatedPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
