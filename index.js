const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

dotenv.config();

const app = express();

// ===================== CORS CONFIG =====================
app.use(
  cors({
    origin: (origin, callback) => {
      // ✅ Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:3000",         // React local
        "http://127.0.0.1:3000",
        "http://localhost",              // generic localhost
        "https://snapcopy.netlify.app",  // Netlify frontend
        "capacitor://localhost",         // Capacitor apps
        "ionic://localhost",             // Ionic apps
      ];

      // ✅ Allow https://localhost and https://localhost:PORT
      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
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

// ✅ Static folders
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/status/files", express.static(path.join(__dirname, "uploads/status")));

// ===================== FILE UPLOAD ROUTE =====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
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

// ===================== SOCKET.IO SETUP =====================
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "https://snapcopy.netlify.app",
        "capacitor://localhost",
        "ionic://localhost",
      ];

      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        callback(null, true);
      } else {
        console.log("❌ Socket Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS (socket)"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // fallback for mobile
});

// ✅ Socket routes
require("./socket/chat")(io);

// ===================== MONGODB =====================
const connectDB = require("./config/db");
connectDB();

// ===================== HEALTH CHECK =====================
app.get("/", (req, res) => {
  res.send("🚀 API is running and Socket.IO is ready!");
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
