const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const JSZip = require("jszip");

dotenv.config();

const app = express();

// ✅ Global CORS config (API + mobile apps)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://snapcopy.netlify.app", // your frontend
      "capacitor://localhost", // Capacitor mobile apps
      "ionic://localhost",     // Ionic apps
      "http://localhost",      // generic localhost
      "https://*",             // (optional) allow any https domain
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===================== ROUTES =====================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/user"));
app.use("/api/chat", require("./routes/messages"));
app.use("/status", require("./routes/status"));
app.use("/posts", require("./routes/posts"));
// app.use("/song", require("./routes/songroute"));

// ✅ Static folders
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/status/files", express.static(path.join(__dirname, "uploads/status")));

// ===================== FILE UPLOAD ROUTE =====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({ fileUrl });
});
// ===============================================================

// ✅ Create HTTP server
const server = http.createServer(app);

// ✅ Socket.IO setup with CORS
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://snapcopy.netlify.app",
      "capacitor://localhost",
      "ionic://localhost",
      "http://localhost",
      "https://*",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // ✅ ensure cross-platform support
});

// ✅ Socket routes
require("./socket/chat")(io);

// ✅ MongoDB connection
const connectDB = require("./config/db");
connectDB();

// ✅ Example health route
app.get("/", (req, res) => {
  res.send("🚀 API is running and Socket.IO is ready!");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
