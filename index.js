const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require("path");
const multer = require("multer");
const JSZip = require('jszip');
const axios = require('axios');
const fs = require('fs');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
 app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/chat', require('./routes/messages'));
app.use('/status', require('./routes/status'));
app.use("/posts", require("./routes/posts"));
// app.use("/song", require("./routes/songroute"));
// Static folder for uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cors({
  origin: ["http://localhost:3000", "https://snapcopy.netlify.app","https://snapxcopy.onrender.com"], // allowed origins
  credentials: true
}));
app.use("/status/files", express.static(path.join(__dirname, "uploads/status")));
// ===================== FILE UPLOAD ROUTE =====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Uploads folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
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

const server = http.createServer(app);
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://snapcopy.netlify.app","https://snapxcopy.onrender.com"],
    methods: ["GET", "POST"]
  }
});

require('./socket/chat')(io);
connectDB();



 

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
